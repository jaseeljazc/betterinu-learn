import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts/attachments?transactionId=xxx ────────
// Lists attachments for a transaction (no presigned URLs)
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;

  const transactionId = req.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
  }

  const rows = await sql`
    SELECT att.id, att.transaction_id, att.s3_key, att.file_name,
           att.file_type, att.file_size, att.uploaded_at,
           aa.id AS ub_id, aa.full_name AS ub_name
    FROM account_attachments att
    LEFT JOIN admin_accounts aa ON aa.id = att.uploaded_by
    WHERE att.transaction_id = ${transactionId}
    ORDER BY att.uploaded_at DESC
  `;

  return NextResponse.json({
    attachments: rows.map((r) => ({
      id: r.id,
      transactionId: r.transaction_id,
      s3Key: r.s3_key,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: r.file_size,
      uploadedAt: r.uploaded_at,
      uploadedBy: r.ub_id ? { id: r.ub_id, fullName: r.ub_name } : null,
      // presignedUrl is never included here — fetch via /attachments/[id]
    })),
  });
}
