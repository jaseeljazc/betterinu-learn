import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts/categories/[id] ──────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const rows = await sql`SELECT * FROM account_categories WHERE id = ${id}`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = rows[0];
  return NextResponse.json({
    category: {
      id: r.id, name: r.name, type: r.type, color: r.color,
      icon: r.icon, isSystem: r.is_system, isArchived: r.is_archived,
    },
  });
}

// ── PATCH /api/admin/accounts/categories/[id] ────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "edit");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await req.json();
  
  if (body.archive) {
    await sql`UPDATE account_categories SET is_archived = TRUE WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }
  if (body.unarchive) {
    await sql`UPDATE account_categories SET is_archived = FALSE WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  const existing = await sql`SELECT * FROM account_categories WHERE id = ${id}`;
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cat = existing[0];

  // System categories: name and type are read-only
  const name = cat.is_system ? (cat.name as string) : (body.name?.trim() ?? cat.name);
  const type = cat.is_system ? (cat.type as string) : (body.type ?? cat.type);
  const color = body.color ?? cat.color;
  const icon = body.icon ?? cat.icon;

  await sql`
    UPDATE account_categories SET name = ${name}, type = ${type}, color = ${color}, icon = ${icon}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/admin/accounts/categories/[id] ────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "accounts", "delete");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await sql`SELECT * FROM account_categories WHERE id = ${id}`;
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing[0].is_system) {
    return NextResponse.json({ error: "System categories cannot be deleted" }, { status: 400 });
  }

  // Check if there are transactions using this category
  const inUse = await sql`SELECT 1 FROM transactions WHERE category_id = ${id} LIMIT 1`;
  if (inUse.length > 0) {
    return NextResponse.json({ error: "Cannot delete category in use. Archive it instead." }, { status: 400 });
  }

  await sql`DELETE FROM account_categories WHERE id = ${id}`;
  
  return NextResponse.json({ ok: true });
}
