import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/dashboard/progress
 * Returns the student's first enrolled course with server-side computed
 * completion percentage.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    // Fetch the first enrolled course (curriculum JSONB contains weeks/days/subModules)
    const courseRows = await sql`
      SELECT c.id, c.title, c.image, c.curriculum
      FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.student_id = ${student.studentId}
        AND c.is_active = true
      ORDER BY sc.assigned_at
      LIMIT 1
    `

    if (courseRows.length === 0) {
      return NextResponse.json({ error: "No enrolled course found" }, { status: 404 })
    }

    const course = courseRows[0]
    const curriculum: any[] = course.curriculum ?? []

    // Count total submodule IDs from curriculum structure
    const allSubModuleIds: string[] = curriculum.flatMap((week: any) =>
      (week.days ?? []).flatMap((day: any) =>
        (day.subModules ?? []).map((m: any) => m.id as string)
      )
    )
    const totalModules = allSubModuleIds.length

    // Fetch completed submodule IDs for this course
    const progressRows = await sql`
      SELECT sub_module_id
      FROM student_progress
      WHERE student_id = ${student.studentId}
        AND course_id  = ${course.id}
    `
    const completedModules = progressRows.length
    const completionPercentage =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

    return NextResponse.json({
      courseId: course.id,
      courseTitle: course.title,
      thumbnailUrl: course.image ?? null,
      completionPercentage,
      completedModules,
      totalModules,
    })
  } catch (err) {
    console.error("Dashboard progress error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
