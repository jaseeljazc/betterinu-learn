import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/courses/[courseId]/curriculum
 * Returns the week index list (no days, no quiz) for an enrolled student.
 * Verifies that the student is enrolled in the course before returning data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const { courseId } = await params

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

  const weeks = await sql`
    SELECT
      id,
      course_id,
      position,
      title,
      is_locked,
      is_shared
    FROM   course_weeks
    WHERE  course_id = ${courseId}
    ORDER  BY position ASC
  `

  return NextResponse.json({ weeks })
}
