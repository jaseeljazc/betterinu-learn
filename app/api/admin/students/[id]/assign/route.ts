import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * POST /api/admin/students/[id]/assign
 * Body: { courseId: string }
 * Assigns a course to a student.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { courseId } = await req.json();

  if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  try {
    await sql`
      INSERT INTO student_courses (student_id, course_id)
      VALUES (${id}, ${courseId})
      ON CONFLICT (student_id, course_id) DO NOTHING
    `;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
