import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

async function recalcBalance(accountId: string) {
  await sql`
    UPDATE accounts
    SET current_balance = (
      SELECT opening_balance FROM accounts WHERE id = ${accountId}
    ) + COALESCE((
      SELECT SUM(
        CASE
          WHEN type = 'income' THEN amount
          WHEN type = 'transfer' AND to_account_id = ${accountId} THEN amount
          WHEN type = 'expense' THEN -amount
          WHEN type = 'transfer' AND account_id = ${accountId} THEN -amount
          ELSE 0
        END
      )
      FROM account_transactions
      WHERE (account_id = ${accountId} OR to_account_id = ${accountId})
        AND status != 'void'
    ), 0)
    WHERE id = ${accountId}
  `;
}

// ── GET /api/admin/accounts/transactions/[id] ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const rows = await sql`
    SELECT
      t.id, t.type, t.amount, t.date, t.description,
      t.reference_number, t.status,
      t.account_id, t.to_account_id, t.category_id,
      t.voided_at, t.voided_by, t.created_by, t.created_at,
      a.id AS acc_id, a.name AS acc_name, a.type AS acc_type,
      ta.id AS to_acc_id, ta.name AS to_acc_name, ta.type AS to_acc_type,
      c.id AS cat_id, c.name AS cat_name, c.type AS cat_type,
      c.color AS cat_color, c.icon AS cat_icon,
      cb.id AS cb_id, cb.full_name AS cb_name,
      vb.id AS vb_id, vb.full_name AS vb_name
    FROM account_transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    LEFT JOIN account_categories c ON c.id = t.category_id
    LEFT JOIN admin_accounts cb ON cb.id = t.created_by
    LEFT JOIN admin_accounts vb ON vb.id = t.voided_by
    WHERE t.id = ${id}
  `;

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = rows[0];

  const attachments = await sql`
    SELECT att.*, aa.id AS ub_id, aa.full_name AS ub_name
    FROM account_attachments att
    LEFT JOIN admin_accounts aa ON aa.id = att.uploaded_by
    WHERE att.transaction_id = ${id}
    ORDER BY att.uploaded_at DESC
  `;

  return NextResponse.json({
    transaction: {
      id: r.id, type: r.type,
      amount: parseFloat(r.amount as string),
      date: r.date, description: r.description,
      referenceNumber: r.reference_number,
      status: r.status,
      voidedAt: r.voided_at, createdAt: r.created_at,
      account: r.acc_id ? { id: r.acc_id, name: r.acc_name, type: r.acc_type } : null,
      toAccount: r.to_acc_id ? { id: r.to_acc_id, name: r.to_acc_name, type: r.to_acc_type } : null,
      category: r.cat_id ? { id: r.cat_id, name: r.cat_name, type: r.cat_type, color: r.cat_color, icon: r.cat_icon } : null,
      createdBy: r.cb_id ? { id: r.cb_id, fullName: r.cb_name } : null,
      voidedBy: r.vb_id ? { id: r.vb_id, fullName: r.vb_name } : null,
      attachments: attachments.map((a) => ({
        id: a.id, transactionId: a.transaction_id,
        s3Key: a.s3_key, fileName: a.file_name,
        fileType: a.file_type, fileSize: a.file_size,
        uploadedAt: a.uploaded_at,
        uploadedBy: a.ub_id ? { id: a.ub_id, fullName: a.ub_name } : null,
      })),
    },
  });
}

// ── PATCH /api/admin/accounts/transactions/[id] ──────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "edit");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await sql`SELECT * FROM account_transactions WHERE id = ${id}`;
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing[0].status === "void") {
    return NextResponse.json({ error: "Cannot edit a voided transaction" }, { status: 400 });
  }

  const body = await req.json();
  const { amount, date, description, referenceNumber, status, categoryId } = body;
  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  await sql`
    UPDATE account_transactions SET
      amount = COALESCE(${amount ?? null}, amount),
      date = COALESCE(${date ?? null}, date),
      description = COALESCE(${description ?? null}, description),
      reference_number = COALESCE(${referenceNumber ?? null}, reference_number),
      status = COALESCE(${status ?? null}, status),
      category_id = COALESCE(${categoryId ?? null}, category_id),
      updated_at = NOW()
    WHERE id = ${id}
  `;

  // Recalc balance for both accounts
  const t = existing[0];
  await recalcBalance(t.account_id as string);
  if (t.to_account_id) await recalcBalance(t.to_account_id as string);

  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by, changes)
    VALUES ('transaction', ${id}, 'updated', ${adminId}, ${JSON.stringify(body)})
  `;

  return NextResponse.json({ 
    ok: true, 
    message: "Transaction updated successfully" 
  });
}
