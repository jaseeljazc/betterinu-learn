import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "accounts", "view");
    if (auth instanceof NextResponse) return auth;

    const rows = await sql`
      SELECT
        a.id,
        a.name,
        a.type,
        a.account_number,
        a.ifsc_code,
        a.opening_balance,
        a.current_balance,
        a.is_active,
        a.created_at,
        aa.id        AS created_by_id,
        aa.full_name AS created_by_name
      FROM accounts a
      LEFT JOIN admin_accounts aa ON aa.id = a.created_by
      ORDER BY a.created_at DESC
    `;

    const accounts = rows.map((r) => ({
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
    }));

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error("GET Accounts Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ── POST /api/admin/accounts ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "accounts", "create");
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, type, accountNumber, ifscCode, openingBalance = 0, isActive = true } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }
    const validTypes = ["cash", "bank", "digital_wallet", "petty_cash"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO accounts (name, type, account_number, ifsc_code, opening_balance, current_balance, is_active, created_by)
      VALUES (
        ${name.trim()},
        ${type},
        ${accountNumber?.trim() || null},
        ${ifscCode?.trim() || null},
        ${openingBalance},
        ${openingBalance},
        ${isActive},
        ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId}
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by, changes)
      VALUES ('account', ${rows[0].id}, 'created', ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId}, ${JSON.stringify({ name, type, openingBalance })})
    `;

    return NextResponse.json({ ok: true, accountId: rows[0].id }, { status: 201 });
  } catch (error: any) {
    console.error("POST Account Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error", stack: error.stack }, { status: 500 });
  }
}
