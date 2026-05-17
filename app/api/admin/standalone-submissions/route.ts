import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/standalone-submissions
 * Returns ALL standalone submissions for review.
 * Optional query: ?studentId=  to filter by student
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  let rows;
  if (studentId) {
    rows = await sql`
      SELECT
        sub.id,
        sub.assignment_id,
        sub.student_id,
        sub.submitted_text,
        sub.submitted_files,
        sub.submitted_at,
        sub.status,
        sub.feedback,
        sub.reviewed_at,
        st.name         AS student_name,
        st.email        AS student_email,
        sa.title        AS assignment_title,
        sa.instructions AS assignment_instructions,
        sa.attached_files AS assignment_files,
        sa.allowed_submission_types,
        sa.scope,
        sa.due_date,
        sa.total_marks,
        c.title         AS course_title,
        c.id            AS course_id
      FROM standalone_assignment_submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN standalone_assignments sa ON sa.id = sub.assignment_id
      LEFT JOIN courses c ON c.id = sa.course_id
      WHERE sub.student_id = ${studentId}
      ORDER BY sub.submitted_at DESC
    `;
  } else {
    rows = await sql`
      SELECT
        sub.id,
        sub.assignment_id,
        sub.student_id,
        sub.submitted_text,
        sub.submitted_files,
        sub.submitted_at,
        sub.status,
        sub.feedback,
        sub.reviewed_at,
        st.name         AS student_name,
        st.email        AS student_email,
        sa.title        AS assignment_title,
        sa.instructions AS assignment_instructions,
        sa.attached_files AS assignment_files,
        sa.allowed_submission_types,
        sa.scope,
        sa.due_date,
        sa.total_marks,
        c.title         AS course_title,
        c.id            AS course_id
      FROM standalone_assignment_submissions sub
      JOIN students st ON st.id = sub.student_id
      JOIN standalone_assignments sa ON sa.id = sub.assignment_id
      LEFT JOIN courses c ON c.id = sa.course_id
      ORDER BY sub.submitted_at DESC
    `;
  }

  return NextResponse.json({ submissions: rows });
}
