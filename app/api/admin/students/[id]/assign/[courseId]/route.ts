import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * DELETE /api/admin/students/[id]/assign/[courseId]
 * Removes a course assignment from a student.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; courseId: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, courseId } = await params;

  await sql`
    DELETE FROM student_courses
    WHERE student_id = ${id} AND course_id = ${courseId}
  `;

  return NextResponse.json({ ok: true });
}
