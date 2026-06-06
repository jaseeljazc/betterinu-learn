import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/dashboard/assignments/pending
 * Returns the single nearest unsubmitted assignment with a future due date.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    // Fetch enrolled course curriculum
    const courseRows = await sql`
      SELECT c.id, c.curriculum
      FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.student_id = ${student.studentId}
        AND c.is_active = true
      ORDER BY sc.assigned_at
      LIMIT 1
    `

    if (courseRows.length === 0) {
      return NextResponse.json({ upcoming: null })
    }

    const course = courseRows[0]
    const curriculum: any[] = course.curriculum ?? []
    const now = new Date()

    // Extract all assignment submodules with a future due_date
    type RawAssignment = { assignmentId: string; courseId: string; title: string; dueDate: Date }
    const assignments: RawAssignment[] = []

    for (const week of curriculum) {
      for (const day of week.days ?? []) {
        for (const mod of day.subModules ?? []) {
          if (mod.type !== "assignment") continue
          const due = mod.assignmentData?.dueDate ?? mod.deadline ?? null
          if (!due) continue
          const dueDate = new Date(due)
          if (dueDate > now) {
            assignments.push({
              assignmentId: mod.id,
              courseId: course.id,
              title: mod.title ?? "Assignment",
              dueDate,
            })
          }
        }
      }
    }

    if (assignments.length === 0) {
      return NextResponse.json({ upcoming: null })
    }

    // Sort by due date ascending, take the nearest
    assignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    const nearest = assignments[0]

    // Check if already submitted
    const submissionRows = await sql`
      SELECT id FROM assignment_submissions
      WHERE assignment_id = ${nearest.assignmentId}
        AND student_id    = ${student.studentId}
      LIMIT 1
    `

    if (submissionRows.length > 0) {
      // Nearest is already submitted — find the first unsubmitted one
      const submittedIds = await sql`
        SELECT assignment_id FROM assignment_submissions
        WHERE student_id = ${student.studentId}
          AND course_id  = ${course.id}
      `
      const submittedSet = new Set(submittedIds.map((r: any) => r.assignment_id as string))

      const unsubmitted = assignments.find((a) => !submittedSet.has(a.assignmentId))
      if (!unsubmitted) return NextResponse.json({ upcoming: null })

      return NextResponse.json({
        upcoming: {
          assignmentId: unsubmitted.assignmentId,
          courseId: unsubmitted.courseId,
          title: unsubmitted.title,
          dueDate: unsubmitted.dueDate.toISOString(),
        },
      })
    }

    return NextResponse.json({
      upcoming: {
        assignmentId: nearest.assignmentId,
        courseId: nearest.courseId,
        title: nearest.title,
        dueDate: nearest.dueDate.toISOString(),
      },
    })
  } catch (err) {
    console.error("Dashboard pending assignments error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
