import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/quiz/[courseId]/[weekId]
 * Returns all quiz attempts for a given course + week.
 * Used client-side to enforce maxAttempts and show attempt history.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; weekId: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { courseId, weekId } = await params;

  const rows = await sql`
    SELECT id, quiz_id, score, passed, answers, attempted_at
    FROM quiz_attempts
    WHERE student_id = ${student.studentId}
      AND course_id  = ${courseId}
      AND week_id    = ${weekId}
    ORDER BY attempted_at ASC
  `;

  return NextResponse.json({ attempts: rows, count: rows.length });
}
