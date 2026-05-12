import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/progress/[courseId]
 * Returns all completed sub_module_ids for the authenticated student in a course.
 * The client uses this array to hydrate the useProgress hook on mount.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { courseId } = await params;

  const rows = await sql`
    SELECT sub_module_id
    FROM student_progress
    WHERE student_id = ${student.studentId}
      AND course_id  = ${courseId}
  `;

  return NextResponse.json({
    subModuleIds: rows.map((r) => r.sub_module_id as string),
  });
}
