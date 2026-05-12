import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * POST /api/student/quiz
 * Body: { courseId, weekId, quizId, score, passed, answers }
 *
 * Stores a quiz attempt. Multiple attempts are allowed — the client
 * enforces maxAttempts by reading GET /api/student/quiz/[courseId]/[weekId].
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { courseId, weekId, quizId, score, passed, answers } = await req.json();

  if (!courseId || !weekId || !quizId || score === undefined || passed === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO quiz_attempts (student_id, course_id, week_id, quiz_id, score, passed, answers)
    VALUES (
      ${student.studentId},
      ${courseId},
      ${weekId},
      ${quizId},
      ${score},
      ${passed},
      ${JSON.stringify(answers ?? {})}
    )
    RETURNING id, attempted_at
  `;

  return NextResponse.json({ ok: true, attempt: rows[0] });
}
