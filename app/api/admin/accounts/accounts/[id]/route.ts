import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts/accounts/[id] ────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const rows = await sql`
    SELECT a.*, aa.id AS created_by_id, aa.full_name AS created_by_name
    FROM accounts a
    LEFT JOIN admin_accounts aa ON aa.id = a.created_by
    WHERE a.id = ${id}
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    account: {
      id: r.id,
      name: r.name,
      type: r.type,
      accountNumber: r.account_number,
      ifscCode: r.ifsc_code,
      openingBalance: parseFloat(r.opening_balance as string),
      currentBalance: parseFloat(r.current_balance as string),
      isActive: r.is_active,
      createdAt: r.created_at,
      createdBy: r.created_by_id
        ? { id: r.created_by_id, fullName: r.created_by_name }
        : null,
    },
  });
}

// ── PATCH /api/admin/accounts/accounts/[id] ──────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "edit");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await req.json();
  const { name, type, accountNumber, ifscCode, isActive } = body;

  const existing = await sql`SELECT id FROM accounts WHERE id = ${id}`;
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (name !== undefined) {
    await sql`UPDATE accounts SET name = ${name.trim()} WHERE id = ${id}`;
  }
  if (type !== undefined) {
    await sql`UPDATE accounts SET type = ${type} WHERE id = ${id}`;
  }
  if (accountNumber !== undefined) {
    await sql`UPDATE accounts SET account_number = ${accountNumber || null} WHERE id = ${id}`;
  }
  if (ifscCode !== undefined) {
    await sql`UPDATE accounts SET ifsc_code = ${ifscCode || null} WHERE id = ${id}`;
  }
  if (isActive !== undefined) {
    await sql`UPDATE accounts SET is_active = ${isActive} WHERE id = ${id}`;
  }

  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by, changes)
    VALUES ('account', ${id}, 'updated', ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId}, ${JSON.stringify(body)})
  `;

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/accounts/accounts/[id] — soft delete ───────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "delete");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  await sql`UPDATE accounts SET is_active = FALSE WHERE id = ${id}`;

  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by)
    VALUES ('account', ${id}, 'deleted', ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId})
  `;

  return NextResponse.json({ ok: true });
}
