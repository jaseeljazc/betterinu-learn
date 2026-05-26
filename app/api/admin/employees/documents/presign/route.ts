import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-rbac";
import { generateUploadPresignedUrl, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/s3-private";

/**
 * POST /api/admin/employees/documents/presign
 * Returns a presigned S3 PUT URL for uploading an employee document directly
 * to the private bucket.
 *
 * Body: { employeeId: string | null, docType: string, fileName: string, fileType: string, fileSize: number }
 * Response: { presignedUrl: string, s3Key: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "create");
  // Also allow editors to upload documents when updating an employee
  const authEdit = auth instanceof NextResponse
    ? await requirePermission(req, "employees", "edit")
    : auth;
  if (auth instanceof NextResponse && authEdit instanceof NextResponse) return auth;

  const body = await req.json();
  const { employeeId, fileName, fileType, fileSize } = body;

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
      employeeId ?? null,
      fileName,
      fileType,
      fileSize,
      "employee-documents"
    );
    return NextResponse.json({ presignedUrl, s3Key });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate upload URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
