import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/assignments/[id]
 * Returns a single submission by its UUID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const admin = await verifyAdminToken(token);
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`
    SELECT
      s.*,
      st.name  AS student_name,
      st.email AS student_email,
      c.title  AS course_title,
      c.curriculum
    FROM assignment_submissions s
    JOIN students st ON st.id = s.student_id
    JOIN courses  c  ON c.id  = s.course_id
    WHERE s.id = ${id}
    LIMIT 1
  `;

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ submission: rows[0] });
}

/**
 * POST /api/admin/assignments/[id]/approve
 * Body: {} (no body needed)
 *
 * 1. Updates submission status → "approved"
 * 2. Inserts a student_progress row so the assignment sub-module is
 *    considered complete, unlocking the next day automatically.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const admin = await verifyAdminToken(token);
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const { action, feedback } = await req.json().catch(() => ({ action: "approve", feedback: "" }));

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
  }

  // Fetch the submission
  const rows = await sql`
    SELECT * FROM assignment_submissions WHERE id = ${id} LIMIT 1
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sub = rows[0];

  // Update submission status
  await sql`
    UPDATE assignment_submissions
    SET
      status      = ${action === "approve" ? "approved" : "rejected"},
      feedback    = ${feedback ?? null},
      reviewed_at = NOW(),
      reviewed_by = ${admin.adminId}
    WHERE id = ${id}
  `;

  // If approving: insert a student_progress completion row
  if (action === "approve") {
    await sql`
      INSERT INTO student_progress
        (student_id, course_id, week_id, day_id, sub_module_id)
      VALUES
        (${sub.student_id}, ${sub.course_id}, ${sub.week_id}, ${sub.day_id}, ${sub.assignment_id})
      ON CONFLICT (student_id, course_id, week_id, day_id, sub_module_id) DO NOTHING
    `;
  }

  return NextResponse.json({ ok: true });
}
