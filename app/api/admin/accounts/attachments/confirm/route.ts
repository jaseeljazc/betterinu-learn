import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { verifyObjectExists, validateS3Key, ALLOWED_TYPES } from "@/lib/s3-private";

// ── POST /api/admin/accounts/attachments/confirm ─────────────────
// Called after a successful S3 PUT to register the attachment in DB
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { transactionId, s3Key, fileName, fileType, fileSize } = body;

  if (!s3Key || !fileName || !fileType || !fileSize) {
    return NextResponse.json({ error: "s3Key, fileName, fileType, and fileSize are required" }, { status: 400 });
  }

  // Validate key pattern to prevent injection
  if (!validateS3Key(s3Key)) {
    return NextResponse.json({ error: "Invalid S3 key format" }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Verify upload actually happened
  const exists = await verifyObjectExists(s3Key);
  if (!exists) {
    return NextResponse.json(
      { error: "File not found in S3. Upload may have failed." },
      { status: 400 }
    );
  }

  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  const rows = await sql`
    INSERT INTO account_attachments (transaction_id, s3_key, file_name, file_type, file_size, uploaded_by)
    VALUES (${transactionId || null}, ${s3Key}, ${fileName}, ${fileType}, ${fileSize}, ${adminId})
    RETURNING id
  `;

  return NextResponse.json({ ok: true, attachmentId: rows[0].id }, { status: 201 });
}
