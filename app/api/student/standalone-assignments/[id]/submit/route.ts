import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/student/standalone-assignments/[id]/submit
 * Body: { submittedText, submittedFiles }
 * Submits or resubmits a student's answer for a standalone assignment.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { submittedText = "", submittedFiles = [] } = await req.json();

  // Verify student is actually assigned this assignment
  const assigned = await sql`
    SELECT id FROM standalone_assignment_student
    WHERE assignment_id = ${id} AND student_id = ${student.studentId}
    LIMIT 1
  `;
  if (!assigned.length)
    return NextResponse.json({ error: "Assignment not assigned to you" }, { status: 403 });

  const rows = await sql`
    INSERT INTO standalone_assignment_submissions
      (assignment_id, student_id, submitted_text, submitted_files, status)
    VALUES
      (${id}, ${student.studentId}, ${submittedText}, ${JSON.stringify(submittedFiles)}::jsonb, 'pending')
    ON CONFLICT (assignment_id, student_id) DO UPDATE SET
      submitted_text  = EXCLUDED.submitted_text,
      submitted_files = EXCLUDED.submitted_files,
      submitted_at    = NOW(),
      status          = 'pending',
      feedback        = NULL
    RETURNING *
  `;

  return NextResponse.json({ ok: true, submission: rows[0] });
}
