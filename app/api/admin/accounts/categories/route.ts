import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts/categories ───────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;

  const rows = await sql`
    SELECT id, name, type, color, icon, is_system, is_archived, created_at
    FROM account_categories
    ORDER BY type, is_system DESC, name
  `;

  return NextResponse.json({
    categories: rows.map((r) => ({
      id: r.id, name: r.name, type: r.type, color: r.color,
      icon: r.icon, isSystem: r.is_system, isArchived: r.is_archived,
      createdAt: r.created_at,
    })),
  });
}

// ── POST /api/admin/accounts/categories ──────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, type, color, icon } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!["income", "expense"].includes(type)) {
    return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO account_categories (name, type, color, icon, is_system)
    VALUES (${name.trim()}, ${type}, ${color || null}, ${icon || null}, FALSE)
    RETURNING id
  `;

  return NextResponse.json({ ok: true, categoryId: rows[0].id }, { status: 201 });
}
