import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"

/**
 * GET /api/admin/courses — list all courses from DB
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "courses", "view")
  if (auth instanceof NextResponse) return auth

  const rows = await sql`SELECT * FROM courses ORDER BY created_at DESC`
  return NextResponse.json({ courses: rows })
}

/**
 * POST /api/admin/courses
 * Create a new course — accepts fee configuration fields added in migration 019.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "courses", "create")
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const {
      id, title, tagline, description, instructor, instructor_bio,
      duration, total_modules, level, color, icon, outcomes, is_active, curriculum,
      image,
      // Fee fields (migration 019)
      one_time_price, installment_total_price,
      default_installment_count, default_installment_amount,
      grace_period_days,
    } = body

    if (!id || !title) {
      return NextResponse.json({ error: "ID and Title are required" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO courses (
        id, title, tagline, description, instructor, instructor_bio,
        duration, total_modules, level, color, icon, outcomes, is_active, curriculum, image,
        one_time_price, installment_total_price,
        default_installment_count, default_installment_amount,
        grace_period_days
      ) VALUES (
        ${id}, ${title}, ${tagline ?? ""}, ${description ?? ""},
        ${instructor ?? ""}, ${instructor_bio ?? ""},
        ${duration ?? ""}, ${total_modules ?? 0}, ${level ?? "Beginner"},
        ${color ?? "--course-default"}, ${icon ?? "Book"},
        ${JSON.stringify(outcomes ?? [])}, ${is_active ?? true},
        ${JSON.stringify(curriculum ?? [])}, ${image ?? ""},
        ${one_time_price ?? null}, ${installment_total_price ?? null},
        ${default_installment_count ?? null}, ${default_installment_amount ?? null},
        ${grace_period_days ?? 3}
      ) RETURNING *
    `

    return NextResponse.json({ course: rows[0] })
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A course with this ID already exists." },
        { status: 400 },
      )
    }
    console.error("Failed to create course:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}
