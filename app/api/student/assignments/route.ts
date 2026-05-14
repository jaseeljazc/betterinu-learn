import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * POST /api/student/assignments
 * Body: { assignmentId, courseId, weekId, dayId, submittedText }
 *
 * Submits or updates a student's assignment answer.
 * Students can only submit once (UNIQUE on assignment_id, student_id).
 */
export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { assignmentId, courseId, weekId, dayId, submittedText, submittedFiles } = await req.json();

  if (!assignmentId || !courseId || !weekId || !dayId || !submittedText?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const filesJson = JSON.stringify(submittedFiles ?? []);

  try {
    const rows = await sql`
      INSERT INTO assignment_submissions
        (assignment_id, student_id, course_id, week_id, day_id, submitted_text, submitted_files)
      VALUES
        (${assignmentId}, ${student.studentId}, ${courseId}, ${weekId}, ${dayId}, ${submittedText.trim()}, ${filesJson}::jsonb)
      ON CONFLICT (assignment_id, student_id)
      DO UPDATE SET
        submitted_text  = EXCLUDED.submitted_text,
        submitted_files = EXCLUDED.submitted_files,
        submitted_at    = NOW(),
        status          = 'pending'
      RETURNING *
    `;
    return NextResponse.json({ ok: true, submission: rows[0] });
  } catch (err) {
    console.error("Assignment submit error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/student/assignments?assignmentId=xxx&courseId=xxx
 * Returns the current student's submission for a given assignment.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");
  const courseId = searchParams.get("courseId");

  if (assignmentId && courseId) {
    const rows = await sql`
      SELECT * FROM assignment_submissions
      WHERE assignment_id = ${assignmentId}
        AND student_id = ${student.studentId}
        AND course_id = ${courseId}
      LIMIT 1
    `;
    return NextResponse.json({ submission: rows[0] ?? null });
  }

  // If no specific assignment is requested, return ALL submissions for this student
  // Join with courses table to get the course title
  const rows = await sql`
    SELECT a.*, c.title as course_title 
    FROM assignment_submissions a
    LEFT JOIN courses c ON a.course_id = c.id
    WHERE a.student_id = ${student.studentId}
    ORDER BY a.submitted_at DESC
  `;

  return NextResponse.json({ submissions: rows });
}
