import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/standalone-assignments
 * Returns all standalone assignments, optionally filtered by ?courseId= or ?scope=common
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const scope = searchParams.get("scope");

  let rows;
  if (courseId) {
    rows = await sql`
      SELECT sa.*,
             c.title AS course_title,
             (SELECT COUNT(*) FROM standalone_assignment_student sas WHERE sas.assignment_id = sa.id)::int AS student_count
      FROM standalone_assignments sa
      LEFT JOIN courses c ON c.id = sa.course_id
      WHERE sa.course_id = ${courseId}
      ORDER BY sa.created_at DESC
    `;
  } else if (scope === "common") {
    rows = await sql`
      SELECT sa.*,
             c.title AS course_title,
             (SELECT COUNT(*) FROM standalone_assignment_student sas WHERE sas.assignment_id = sa.id)::int AS student_count
      FROM standalone_assignments sa
      LEFT JOIN courses c ON c.id = sa.course_id
      WHERE sa.scope = 'common'
      ORDER BY sa.created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT sa.*,
             c.title AS course_title,
             (SELECT COUNT(*) FROM standalone_assignment_student sas WHERE sas.assignment_id = sa.id)::int AS student_count
      FROM standalone_assignments sa
      LEFT JOIN courses c ON c.id = sa.course_id
      ORDER BY sa.created_at DESC
    `;
  }

  return NextResponse.json({ assignments: rows });
}

/**
 * POST /api/admin/standalone-assignments
 * Body: { title, instructions, dueDate, totalMarks, allowedSubmissionTypes, attachedFiles, referenceLinks, scope, courseId }
 */
export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    title,
    instructions = "",
    dueDate = null,
    totalMarks = null,
    allowedSubmissionTypes = ["text"],
    attachedFiles = [],
    referenceLinks = [],
    scope = "course",
    courseId = null,
  } = body;

  if (!title?.trim())
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (scope === "course" && !courseId)
    return NextResponse.json({ error: "courseId is required for course-specific assignments" }, { status: 400 });

  const rows = await sql`
    INSERT INTO standalone_assignments
      (title, instructions, due_date, total_marks, allowed_submission_types, attached_files, reference_links, scope, course_id)
    VALUES
      (${title.trim()}, ${instructions}, ${dueDate}, ${totalMarks},
       ${JSON.stringify(allowedSubmissionTypes)}::jsonb,
       ${JSON.stringify(attachedFiles)}::jsonb,
       ${JSON.stringify(referenceLinks)}::jsonb,
       ${scope}, ${courseId})
    RETURNING *
  `;

  return NextResponse.json({ assignment: rows[0] }, { status: 201 });
}
