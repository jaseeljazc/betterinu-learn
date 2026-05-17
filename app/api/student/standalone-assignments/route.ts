import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/standalone-assignments
 * Returns all standalone assignments assigned to the current student,
 * including their submission status if they've already submitted.
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
      sa.id               AS assignment_id,
      sa.title,
      sa.instructions,
      sa.due_date,
      sa.total_marks,
      sa.allowed_submission_types,
      sa.attached_files,
      sa.reference_links,
      sa.scope,
      sa.created_at,
      c.title             AS course_title,
      c.id                AS course_id,
      sub.id              AS submission_id,
      sub.submitted_text,
      sub.submitted_files,
      sub.submitted_at,
      sub.status          AS submission_status,
      sub.feedback
    FROM standalone_assignment_student sas
    JOIN standalone_assignments sa ON sa.id = sas.assignment_id
    LEFT JOIN courses c ON c.id = sa.course_id
    LEFT JOIN standalone_assignment_submissions sub
      ON sub.assignment_id = sa.id AND sub.student_id = ${student.studentId}
    WHERE sas.student_id = ${student.studentId}
    ORDER BY sa.created_at DESC
  `;

  return NextResponse.json({ assignments: rows });
}
