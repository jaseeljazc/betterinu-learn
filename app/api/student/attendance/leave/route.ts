import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/attendance/leave
 * Returns all leave requests for the logged-in student.
 * Optional: ?month=YYYY-MM to filter by month
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  try {
    let rows;
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
      rows = await sql`
        SELECT id, date::text AS date, reason, status, admin_note, created_at::text AS created_at
        FROM student_leave_requests
        WHERE student_id = ${student.studentId}
          AND date >= ${start}::date
          AND date <= ${end}::date
        ORDER BY date DESC
      `;
    } else {
      rows = await sql`
        SELECT id, date::text AS date, reason, status, admin_note, created_at::text AS created_at
        FROM student_leave_requests
        WHERE student_id = ${student.studentId}
        ORDER BY date DESC
        LIMIT 50
      `;
    }
    return NextResponse.json({ requests: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
