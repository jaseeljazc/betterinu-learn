import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/course-assignments
 * Returns all course-embedded assignment submissions for the logged-in student,
 * with assignment title resolved from the course curriculum JSON.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT
      s.id            AS submission_id,
      s.assignment_id,
      s.course_id,
      s.week_id,
      s.day_id,
      s.submitted_text,
      s.submitted_files,
      s.submitted_at,
      s.status        AS submission_status,
      s.feedback,
      s.reviewed_at,
      c.title         AS course_title,
      c.curriculum    AS course_curriculum
    FROM assignment_submissions s
    JOIN courses c ON c.id = s.course_id
    WHERE s.student_id = ${student.studentId}
    ORDER BY s.submitted_at DESC
  `;

  // Resolve assignment title from the curriculum JSON
  const assignments = rows.map((row) => {
    let title = row.assignment_id as string;
    let dueDate: string | null = null;

    if (row.course_curriculum && Array.isArray(row.course_curriculum)) {
      outer: for (const week of row.course_curriculum) {
        if (!week.days) continue;
        for (const day of week.days) {
          if (!day.subModules) continue;
          for (const mod of day.subModules) {
            if (mod.id === row.assignment_id) {
              title =
                mod.assignmentData?.title ||
                mod.title ||
                row.assignment_id;
              dueDate = mod.assignmentData?.dueDate ?? null;
              break outer;
            }
          }
        }
      }
    }

    const { course_curriculum, ...rest } = row;
    return {
      ...rest,
      title,
      due_date: dueDate,
      scope: "course" as const,
    };
  });

  return NextResponse.json({ assignments });
}
