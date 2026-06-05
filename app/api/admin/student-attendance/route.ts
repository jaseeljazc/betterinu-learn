import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/student-attendance
 * Query params:
 *   date=YYYY-MM-DD  → single day view (defaults to today IST)
 *   month=YYYY-MM    → full month view (used by the attendance grid)
 *   studentId=uuid   → optional filter
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam     = searchParams.get("month");   // "2026-06"
  const dateParam      = searchParams.get("date");
  const studentIdParam = searchParams.get("studentId");

  let startDate: string;
  let endDate: string;

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (!y || !m) {
      return NextResponse.json({ error: "Invalid month format, use YYYY-MM" }, { status: 400 });
    }
    startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    endDate = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
  } else {
    const today = dateParam || new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    startDate = today;
    endDate   = today;
  }

  try {
    const rows = await sql`
      SELECT
        sa.id,
        sa.date::text      AS date,
        sa.status,
        sa.punch_in,
        sa.punch_out,
        sa.punch_in_ip,
        sa.punch_out_ip,
        sa.is_trusted,
        sa.note,
        sa.marked_by,
        s.id               AS student_id,
        s.name             AS student_name,
        s.email            AS student_email
      FROM student_attendance sa
      JOIN students s ON s.id = sa.student_id
      WHERE sa.date >= ${startDate}::date
        AND sa.date <= ${endDate}::date
        ${studentIdParam ? sql`AND sa.student_id = ${studentIdParam}` : sql``}
      ORDER BY sa.date ASC, s.name ASC
    `;

    return NextResponse.json({ records: rows });
  } catch (err: any) {
    console.error("GET /api/admin/student-attendance:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
