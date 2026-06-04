import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/student-attendance/flagged
 * Returns all student attendance rows where is_trusted = FALSE
 * (student punched in from an unknown IP).
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT
        sa.id,
        sa.date::text   AS date,
        sa.punch_in,
        sa.punch_out,
        sa.punch_in_ip,
        sa.punch_out_ip,
        sa.is_trusted,
        s.id            AS student_id,
        s.name          AS student_name,
        s.email         AS student_email
      FROM student_attendance sa
      JOIN students s ON s.id = sa.student_id
      WHERE sa.is_trusted = FALSE
        AND sa.punch_in IS NOT NULL
      ORDER BY sa.punch_in DESC
      LIMIT 100
    `;

    return NextResponse.json({ flagged: rows });
  } catch (err: any) {
    console.error("GET /api/admin/student-attendance/flagged:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
