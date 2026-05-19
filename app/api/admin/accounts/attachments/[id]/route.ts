import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import {
  generateViewPresignedUrl,
  generateDownloadPresignedUrl,
  deletePrivateObject,
} from "@/lib/s3-private";

// ── GET /api/admin/accounts/attachments/[id] ─────────────────────
// Returns a fresh presigned URL — never cached
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const rows = await sql`
    SELECT id, s3_key, file_name, file_type FROM account_attachments WHERE id = ${id}
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const att = rows[0];
  const download = req.nextUrl.searchParams.get("download") === "1";

  const presignedUrl = download
    ? await generateDownloadPresignedUrl(att.s3_key as string, att.file_name as string)
    : await generateViewPresignedUrl(att.s3_key as string);

  const response = NextResponse.json({ presignedUrl, fileName: att.file_name, fileType: att.file_type });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

// ── DELETE /api/admin/accounts/attachments/[id] ──────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "delete");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const rows = await sql`
    SELECT id, s3_key, transaction_id FROM account_attachments WHERE id = ${id}
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const att = rows[0];
  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  // Delete from S3 first
  try {
    await deletePrivateObject(att.s3_key as string);
  } catch (err) {
    console.error("[attachment] S3 delete failed:", err);
    // Continue to delete DB record even if S3 fails (object may already be gone)
  }

  // Delete DB record
  await sql`DELETE FROM account_attachments WHERE id = ${id}`;


  // Audit log
  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by)
    VALUES ('attachment', ${id}, 'deleted', ${adminId})
  `;

  return NextResponse.json({ ok: true });
}
