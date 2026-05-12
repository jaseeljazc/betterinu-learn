import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { extractToken, verifyAdminToken, verifyStudentToken } from "@/lib/auth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

export const runtime = "nodejs";

/**
 * POST /api/upload
 * multipart/form-data:
 *   - file: the file blob
 *   - folder: bucket key prefix, e.g. "lessons/mod-123"
 *   - role: "admin" | "student"
 */
export async function POST(req: NextRequest) {
  // Auth
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";

  const role = req.nextUrl.searchParams.get("role") ?? "admin";
  let authed = false;
  if (role === "student") {
    authed = !!(await verifyStudentToken(token));
  } else {
    authed = !!(await verifyAdminToken(token));
  }
  if (!authed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Parse multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "uploads";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Sanitise file name
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${Date.now()}_${safeName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        // Public ACL might require enabling on bucket if needed, otherwise rely on presigned URLs or public bucket policy.
        // We assume the bucket is public readable for these items as they're public resources.
        // ACL: "public-read",
      })
    );

    // Build final public URL format for AWS standard buckets:
    // https://bucket-name.s3.region.amazonaws.com/key
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      ok: true,
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (err: any) {
    console.error("[upload] S3 error:", err);
    return NextResponse.json(
      { error: "Upload failed: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
