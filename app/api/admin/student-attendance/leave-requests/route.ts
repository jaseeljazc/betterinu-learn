import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/student-attendance/leave-requests
 * Lists leave requests with pagination support
 * Query params: ?status=pending|approved|rejected&studentId=uuid&limit=20&cursor=lastCreatedAt
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!(await verifyAdminToken(token)))
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter    = searchParams.get("status");
  const studentIdFilter = searchParams.get("studentId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const cursor = searchParams.get("cursor"); // ISO timestamp

  try {
    const rows = await sql`
      SELECT
        lr.id,
        lr.date::text   AS date,
        lr.reason,
        lr.status,
        lr.admin_note,
        lr.created_at::text   AS created_at,
        lr.reviewed_at::text  AS reviewed_at,
        s.id            AS student_id,
        s.name          AS student_name,
        s.email         AS student_email,
        aa.id           AS reviewer_id,
        aa.full_name    AS reviewer_name
      FROM student_leave_requests lr
      JOIN students s ON s.id = lr.student_id
      LEFT JOIN admin_accounts aa ON aa.id = lr.reviewed_by
      WHERE 1=1
        ${statusFilter    ? sql`AND lr.status = ${statusFilter}` : sql``}
        ${studentIdFilter ? sql`AND lr.student_id = ${studentIdFilter}` : sql``}
        ${cursor ? sql`AND lr.created_at < ${cursor}::timestamptz` : sql``}
      ORDER BY lr.created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const requests = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? requests[requests.length - 1].created_at : null;

    return NextResponse.json({ requests, nextCursor, hasMore });
  } catch (err: any) {
    console.error("GET /api/admin/student-attendance/leave-requests:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
