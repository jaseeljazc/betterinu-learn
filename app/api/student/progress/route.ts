import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * POST /api/student/progress
 * Body: { courseId, weekId, dayId, subModuleId }
 *
 * Upserts a sub-module completion record.
 * UNIQUE constraint ensures double-completion is a no-op.
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { courseId, weekId, dayId, subModuleId } = await req.json();

  if (!courseId || !weekId || !dayId || !subModuleId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await sql`
    INSERT INTO student_progress (student_id, course_id, week_id, day_id, sub_module_id)
    VALUES (${student.studentId}, ${courseId}, ${weekId}, ${dayId}, ${subModuleId})
    ON CONFLICT (student_id, course_id, week_id, day_id, sub_module_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true });
}
