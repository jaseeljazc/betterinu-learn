import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/assignments
 * Returns all student assignment submissions across all courses,
 * joined with student name and course title.
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
        s.id          AS id,
        s.assignment_id,
        s.course_id,
        s.week_id,
        s.day_id,
        s.submitted_text,
        s.submitted_files,
        s.submitted_at,
        s.status,
        s.feedback,
        s.reviewed_at,
        st.name       AS student_name,
        st.email      AS student_email,
        st.id         AS student_id,
        c.title       AS course_title
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN courses  c  ON c.id  = s.course_id
      WHERE s.student_id = ${studentId}
      ORDER BY s.submitted_at DESC
    `;
  } else {
    rows = await sql`
      SELECT
        s.id          AS id,
        s.assignment_id,
        s.course_id,
        s.week_id,
        s.day_id,
        s.submitted_text,
        s.submitted_files,
        s.submitted_at,
        s.status,
        s.feedback,
        s.reviewed_at,
        st.name       AS student_name,
        st.email      AS student_email,
        st.id         AS student_id,
        c.title       AS course_title
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN courses  c  ON c.id  = s.course_id
      ORDER BY s.submitted_at DESC
    `;
  }

  return NextResponse.json({ submissions: rows });
}
