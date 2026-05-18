import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-rbac";
import { generateUploadPresignedUrl, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/s3-private";

// ── POST /api/admin/accounts/attachments/presign ─────────────────
// Returns a presigned PUT URL for uploading directly to S3
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { transactionId, fileName, fileType, fileSize } = body;

  if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  if (!fileType) return NextResponse.json({ error: "fileType is required" }, { status: 400 });
  if (!fileSize || fileSize <= 0) return NextResponse.json({ error: "fileSize must be positive" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `File type '${fileType}' is not allowed. Accepted: JPEG, PNG, WEBP, PDF.` },
      { status: 400 }
    );
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File size exceeds 10 MB limit." }, { status: 400 });
  }

  try {
    const { presignedUrl, s3Key } = await generateUploadPresignedUrl(
      transactionId ?? null,
      fileName,
      fileType,
      fileSize
    );

    return NextResponse.json({ presignedUrl, s3Key });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate upload URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
