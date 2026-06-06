import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"

/**
 * GET /api/admin/courses/[id]/curriculum
 * Returns the index list of weeks for a course (no days, no quiz payload).
 * Only week metadata is returned so the admin curriculum list view stays fast.
 *
 * POST /api/admin/courses/[id]/curriculum
 * Appends a new week to the end of the course curriculum.
 * Body: { id, title, is_locked?, is_shared?, days?, quiz? }
 */

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "view")
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const weeks = await sql`
    SELECT
      id,
      course_id,
      position,
      title,
      is_locked,
      is_shared
    FROM  course_weeks
    WHERE course_id = ${id}
    ORDER BY position ASC
  `

  return NextResponse.json({ weeks })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "create")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()

  const {
    id: weekId,
    title,
    is_locked = false,
    is_shared = false,
    days = [],
    quiz = null,
  } = body

  if (!weekId || !title) {
    return NextResponse.json(
      { error: "Week id and title are required" },
      { status: 400 },
    )
  }

  // Compute next position (MAX + 1, or 0 for first week)
  const [posRow] = await sql`
    SELECT COALESCE(MAX(position) + 1, 0) AS next_pos
    FROM   course_weeks
    WHERE  course_id = ${id}
  `
  const position: number = posRow.next_pos

  try {
    const [week] = await sql`
      INSERT INTO course_weeks
        (id, course_id, position, title, is_locked, is_shared, days, quiz, created_at, updated_at)
      VALUES (
        ${weekId},
        ${id},
        ${position},
        ${title},
        ${is_locked},
        ${is_shared},
        ${JSON.stringify(days)}::jsonb,
        ${quiz !== null ? JSON.stringify(quiz) : null}::jsonb,
        now(),
        now()
      )
      RETURNING *
    `
    return NextResponse.json({ week }, { status: 201 })
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A week with this id already exists in this course" },
        { status: 409 },
      )
    }
    console.error("POST curriculum week failed:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
