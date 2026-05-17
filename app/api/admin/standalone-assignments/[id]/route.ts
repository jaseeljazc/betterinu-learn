import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/standalone-assignments/[id] */
export async function GET(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT sa.*, c.title AS course_title
    FROM standalone_assignments sa
    LEFT JOIN courses c ON c.id = sa.course_id
    WHERE sa.id = ${id}
    LIMIT 1
  `;
  if (!rows.length)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ assignment: rows[0] });
}

/** PUT /api/admin/standalone-assignments/[id] */
export async function PUT(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    title,
    instructions = "",
    dueDate = null,
    totalMarks = null,
    allowedSubmissionTypes = ["text"],
    attachedFiles = [],
    referenceLinks = [],
    scope,
    courseId = null,
  } = body;

  await sql`
    UPDATE standalone_assignments SET
      title = ${title},
      instructions = ${instructions},
      due_date = ${dueDate},
      total_marks = ${totalMarks},
      allowed_submission_types = ${JSON.stringify(allowedSubmissionTypes)}::jsonb,
      attached_files = ${JSON.stringify(attachedFiles)}::jsonb,
      reference_links = ${JSON.stringify(referenceLinks)}::jsonb,
      scope = ${scope},
      course_id = ${courseId}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/standalone-assignments/[id] */
export async function DELETE(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  await sql`DELETE FROM standalone_assignments WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
