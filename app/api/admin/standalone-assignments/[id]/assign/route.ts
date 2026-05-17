import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/standalone-assignments/[id]/assign
 * Body: { studentIds: string[] }  (empty array = assign to all eligible students)
 * 
 * For scope='common': studentIds can be omitted to assign to ALL students.
 * For scope='course': only students enrolled in that course are valid.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { studentIds, assignAll = false } = body;

  // Fetch the assignment to know its scope/courseId
  const asgRows = await sql`SELECT * FROM standalone_assignments WHERE id = ${id} LIMIT 1`;
  if (!asgRows.length)
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const assignment = asgRows[0];
  let targetStudentIds: string[] = [];

  if (assignAll || (!studentIds?.length)) {
    // Assign to all eligible students
    if (assignment.scope === "common") {
      const allStudents = await sql`SELECT id FROM students`;
      targetStudentIds = allStudents.map((s: any) => s.id);
    } else {
      // Course-specific: assign to all students enrolled in that course
      const enrolled = await sql`
        SELECT student_id FROM student_courses WHERE course_id = ${assignment.course_id}
      `;
      targetStudentIds = enrolled.map((s: any) => s.student_id);
    }
  } else {
    targetStudentIds = studentIds;
  }

  if (!targetStudentIds.length)
    return NextResponse.json({ ok: true, assigned: 0 });

  // Bulk insert, ignoring conflicts
  let assigned = 0;
  for (const sid of targetStudentIds) {
    try {
      await sql`
        INSERT INTO standalone_assignment_student (assignment_id, student_id)
        VALUES (${id}, ${sid})
        ON CONFLICT (assignment_id, student_id) DO NOTHING
      `;
      assigned++;
    } catch {
      // skip duplicates
    }
  }

  return NextResponse.json({ ok: true, assigned });
}

/**
 * DELETE /api/admin/standalone-assignments/[id]/assign
 * Body: { studentId }  — unassign one student
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { studentId } = await req.json();

  await sql`
    DELETE FROM standalone_assignment_student
    WHERE assignment_id = ${id} AND student_id = ${studentId}
  `;

  return NextResponse.json({ ok: true });
}
