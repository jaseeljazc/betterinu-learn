import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * PUT /api/admin/courses/[id]
 * Body: Partial course metadata fields
 * Updates editable metadata — content never touches the DB.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "courses", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  const {
    title, tagline, description, instructor, instructor_bio,
    duration, total_modules, level, color, icon, outcomes, is_active, curriculum,
    image
  } = body;

  await sql`
    UPDATE courses SET
      title          = COALESCE(${title},          title),
      tagline        = COALESCE(${tagline},        tagline),
      description    = COALESCE(${description},    description),
      instructor     = COALESCE(${instructor},     instructor),
      instructor_bio = COALESCE(${instructor_bio}, instructor_bio),
      duration       = COALESCE(${duration},       duration),
      total_modules  = COALESCE(${total_modules},  total_modules),
      level          = COALESCE(${level},          level),
      color          = COALESCE(${color},          color),
      icon           = COALESCE(${icon},           icon),
      image          = COALESCE(${image ?? null},  image),

      outcomes       = COALESCE(${outcomes != null ? JSON.stringify(outcomes) : null}, outcomes::text)::jsonb,
      is_active      = COALESCE(${is_active},      is_active),
      curriculum     = COALESCE(${curriculum != null ? JSON.stringify(curriculum) : null}, curriculum::text)::jsonb
    WHERE id = ${id}
  `;

  const rows = await sql`SELECT * FROM courses WHERE id = ${id}`;
  return NextResponse.json({ course: rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "courses", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    await sql`DELETE FROM courses WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
