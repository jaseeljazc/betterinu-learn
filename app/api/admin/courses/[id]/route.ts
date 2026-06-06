import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { neon } from "@neondatabase/serverless"

/**
 * PUT /api/admin/courses/[id]
 * Updates editable metadata including fee configuration fields added in migration 019.
 *
 * Phase 5 (migration 029): The dual-write to course_weeks has been removed.
 * Curriculum data is now managed exclusively via the /curriculum/* API routes.
 * The courses.curriculum column has been renamed to curriculum_backup.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "courses", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()

  const {
    title, tagline, description, instructor, instructor_bio,
    duration, total_modules, level, color, icon, outcomes, is_active,
    image,
    // Fee fields (migration 019)
    one_time_price, installment_total_price,
    default_installment_count, default_installment_amount,
    grace_period_days,
  } = body

  // Use a fresh neon client
  const sql = neon(process.env.NEON_DATABASE_URL!)

  // Update the courses row — curriculum column excluded (now in course_weeks)
  await sql`
    UPDATE courses SET
      title                      = COALESCE(${title},          title),
      tagline                    = COALESCE(${tagline},        tagline),
      description                = COALESCE(${description},    description),
      instructor                 = COALESCE(${instructor},     instructor),
      instructor_bio             = COALESCE(${instructor_bio}, instructor_bio),
      duration                   = COALESCE(${duration},       duration),
      total_modules              = COALESCE(${total_modules},  total_modules),
      level                      = COALESCE(${level},          level),
      color                      = COALESCE(${color},          color),
      icon                       = COALESCE(${icon},           icon),
      image                      = COALESCE(${image ?? null},  image),
      outcomes                   = COALESCE(${outcomes != null ? JSON.stringify(outcomes) : null}, outcomes::text)::jsonb,
      is_active                  = COALESCE(${is_active},      is_active),
      one_time_price             = COALESCE(${one_time_price ?? null},             one_time_price),
      installment_total_price    = COALESCE(${installment_total_price ?? null},    installment_total_price),
      default_installment_count  = COALESCE(${default_installment_count ?? null},  default_installment_count),
      default_installment_amount = COALESCE(${default_installment_amount ?? null}, default_installment_amount),
      grace_period_days          = COALESCE(${grace_period_days ?? null},          grace_period_days)
    WHERE id = ${id}
  `

  const rows = await sql`SELECT * FROM courses WHERE id = ${id}`
  return NextResponse.json({ course: rows[0] })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "courses", "delete")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const sql = neon(process.env.NEON_DATABASE_URL!)

  try {
    await sql`DELETE FROM courses WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
