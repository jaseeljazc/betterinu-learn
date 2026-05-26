import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-rbac";
import { deletePrivateObject, validateEmployeeDocS3Key } from "@/lib/s3-private";

/**
 * DELETE /api/admin/employees/documents/delete-pending
 * Deletes a file from the private S3 bucket. Used to clean up orphaned
 * files when a user removes them from the form before submission, or cancels
 * the form entirely.
 *
 * Body: { s3Key: string }
 * Response: { ok: true }
 */
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "create");
  const authEdit = auth instanceof NextResponse
    ? await requirePermission(req, "employees", "edit")
    : auth;
  if (auth instanceof NextResponse && authEdit instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { s3Key } = body;

    if (!s3Key) {
      return NextResponse.json({ error: "s3Key is required" }, { status: 400 });
    }

    if (!validateEmployeeDocS3Key(s3Key)) {
      return NextResponse.json({ error: "Invalid S3 key format" }, { status: 400 });
    }

    await deletePrivateObject(s3Key);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[delete-pending] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete file";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
