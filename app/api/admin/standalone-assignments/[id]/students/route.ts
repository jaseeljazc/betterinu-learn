import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/standalone-assignments/[id]/students
 * Returns all students assigned to this standalone assignment + their submission details.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT
      st.id               AS student_id,
      st.name             AS student_name,
      st.email            AS student_email,
      sas.assigned_at,
      sub.id              AS submission_id,
      sub.status          AS submission_status,
      sub.submitted_at,
      sub.submitted_text,
      sub.submitted_files,
      sub.feedback,
      sub.reviewed_at
    FROM standalone_assignment_student sas
    JOIN students st ON st.id = sas.student_id
    LEFT JOIN standalone_assignment_submissions sub
      ON sub.assignment_id = sas.assignment_id AND sub.student_id = sas.student_id
    WHERE sas.assignment_id = ${id}
    ORDER BY sas.assigned_at DESC
  `;

  return NextResponse.json({ students: rows });
}
