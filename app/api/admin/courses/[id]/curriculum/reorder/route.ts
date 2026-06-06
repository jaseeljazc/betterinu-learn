import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"

/**
 * PATCH /api/admin/courses/[id]/curriculum/reorder
 * Bulk-updates the position of every week in one request.
 * Body: { orderedIds: string[] }
 *   — orderedIds[0] gets position 0, orderedIds[1] gets position 1, etc.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "curriculum", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()
  const { orderedIds } = body as { orderedIds?: string[] }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "orderedIds must be a non-empty array of week id strings" },
      { status: 400 },
    )
  }

  // Build a VALUES list so we can do a single UPDATE … FROM (VALUES …) statement.
  // Each entry: (weekId, newPosition)
  // We use unnest with two arrays — supported by neon/Postgres.
  const ids = orderedIds
  const positions = orderedIds.map((_, i) => i)

  await sql`
    UPDATE course_weeks AS cw
    SET
      position   = v.new_pos::int,
      updated_at = now()
    FROM (
      SELECT
        unnest(${ids}::text[])    AS week_id,
        unnest(${positions}::int[]) AS new_pos
    ) AS v
    WHERE cw.id        = v.week_id
      AND cw.course_id = ${id}
  `

  // Return the updated index list so the caller can refresh its state
  const weeks = await sql`
    SELECT id, course_id, position, title, is_locked, is_shared
    FROM   course_weeks
    WHERE  course_id = ${id}
    ORDER  BY position ASC
  `

  return NextResponse.json({ weeks })
}
