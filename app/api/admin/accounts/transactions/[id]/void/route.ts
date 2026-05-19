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

// ── POST /api/admin/accounts/transactions/[id]/void ──────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "edit");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const url = new URL(req.url);
  const action = url.pathname.endsWith("/void") ? "void" : "restore";

  const existing = await sql`SELECT * FROM account_transactions WHERE id = ${id}`;
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const t = existing[0];
  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  if (action === "void") {
    if (t.status === "void") {
      return NextResponse.json({ error: "Already voided" }, { status: 400 });
    }
    await sql`
      UPDATE account_transactions
      SET status = 'void', voided_by = ${adminId}, voided_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    if (t.status !== "void") {
      return NextResponse.json({ error: "Not voided" }, { status: 400 });
    }
    await sql`
      UPDATE account_transactions
      SET status = 'confirmed', voided_by = NULL, voided_at = NULL, updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  await recalcBalance(t.account_id as string);
  if (t.to_account_id) await recalcBalance(t.to_account_id as string);

  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by)
    VALUES ('transaction', ${id}, ${action === "void" ? "voided" : "restored"}, ${adminId})
  `;

  return NextResponse.json({ ok: true });
}
