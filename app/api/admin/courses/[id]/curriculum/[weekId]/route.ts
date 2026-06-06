import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"

/**
 * GET /api/admin/courses/[id]/curriculum/[weekId]
 * Returns the full week row including days JSONB and quiz JSONB.
 *
 * PUT /api/admin/courses/[id]/curriculum/[weekId]
 * Replaces all mutable fields of a week (title, is_locked, is_shared, days, quiz).
 *
 * DELETE /api/admin/courses/[id]/curriculum/[weekId]
 * Removes the week and re-sequences the positions of remaining weeks.
 */

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; weekId: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "view")
  if (auth instanceof NextResponse) return auth

  const { id, weekId } = await params

  const rows = await sql`
    SELECT *
    FROM   course_weeks
    WHERE  id        = ${weekId}
      AND  course_id = ${id}
    LIMIT  1
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 })
  }

  return NextResponse.json({ week: rows[0] })
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; weekId: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "edit")
  if (auth instanceof NextResponse) return auth

  const { id, weekId } = await params
  const body = await req.json()

  const {
    title,
    is_locked,
    is_shared,
    days,
    quiz,
  } = body

  const rows = await sql`
    UPDATE course_weeks
    SET
      title      = COALESCE(${title      ?? null}, title),
      is_locked  = COALESCE(${is_locked  ?? null}, is_locked),
      is_shared  = COALESCE(${is_shared  ?? null}, is_shared),
      days       = COALESCE(${days      != null ? JSON.stringify(days)      : null}::jsonb, days),
      quiz       = COALESCE(${quiz      != null ? JSON.stringify(quiz)      : null}::jsonb, quiz),
      updated_at = now()
    WHERE id        = ${weekId}
      AND course_id = ${id}
    RETURNING *
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 })
  }

  return NextResponse.json({ week: rows[0] })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; weekId: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "delete")
  if (auth instanceof NextResponse) return auth

  const { id, weekId } = await params

  // Delete the target week
  const deleted = await sql`
    DELETE FROM course_weeks
    WHERE id        = ${weekId}
      AND course_id = ${id}
    RETURNING position
  `

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 })
  }

  const deletedPosition: number = deleted[0].position

  // Re-sequence: decrement position of every week that came after the deleted one
  await sql`
    UPDATE course_weeks
    SET
      position   = position - 1,
      updated_at = now()
    WHERE course_id = ${id}
      AND position  > ${deletedPosition}
  `

  return NextResponse.json({ success: true })
}
