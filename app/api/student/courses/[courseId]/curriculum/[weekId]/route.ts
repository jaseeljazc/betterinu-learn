import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/courses/[courseId]/curriculum/[weekId]
 * Returns the full week row (including days and quiz) for an enrolled student.
 * This is the per-week lazy-load endpoint used when a student opens a week.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; weekId: string }> },
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const { courseId, weekId } = await params

  // Confirm enrollment + active course in one query
  const enrollment = await sql`
    SELECT sc.id
    FROM   student_courses sc
    JOIN   courses c ON c.id = sc.course_id
    WHERE  sc.student_id = ${student.studentId}
      AND  c.id          = ${courseId}
      AND  c.is_active   = true
    LIMIT  1
  `

  if (enrollment.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  const rows = await sql`
    SELECT *
    FROM   course_weeks
    WHERE  id        = ${weekId}
      AND  course_id = ${courseId}
    LIMIT  1
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: "Week not found" }, { status: 404 })
  }

  const r = rows[0]
  const week = {
    id: r.id,
    title: r.title,
    isLocked: r.is_locked,
    isShared: r.is_shared,
    days: r.days ?? [],
    quiz: r.quiz ?? null,
    position: r.position,
  }

  return NextResponse.json({ week })
}
