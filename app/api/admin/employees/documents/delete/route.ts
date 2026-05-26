import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { deletePrivateObject, validateEmployeeDocS3Key } from "@/lib/s3-private";

/**
 * POST /api/admin/employees/documents/delete
 * Bulk deletes confirmed documents from database and S3.
 *
 * Body: { s3Keys: string[] }
 * Response: { ok: true }
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "edit");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { s3Keys } = body;

    if (!s3Keys || !Array.isArray(s3Keys)) {
      return NextResponse.json({ error: "s3Keys array is required" }, { status: 400 });
    }

    const deletedKeys: string[] = [];

    for (const key of s3Keys) {
      if (!key || typeof key !== "string" || !validateEmployeeDocS3Key(key)) {
        continue;
      }

      // Delete database reference first
      await sql`
        DELETE FROM employee_documents
        WHERE s3_key = ${key}
      `;

      // Delete from S3 private bucket
      try {
        await deletePrivateObject(key);
        deletedKeys.push(key);
      } catch (s3Err) {
        console.error(`[delete-docs] S3 deletion failed for key ${key}:`, s3Err);
      }
    }

    return NextResponse.json({ ok: true, deletedKeys });
  } catch (err: unknown) {
    console.error("[delete-docs] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete files";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
