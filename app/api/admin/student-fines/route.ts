import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/student-fines
 * Query: ?studentId=uuid  ?status=pending|paid|waived  ?period=YYYY-MM  ?limit=10  ?cursor=lastCreatedAt
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const period = searchParams.get("period");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
  const cursor = searchParams.get("cursor"); // ISO timestamp

  try {
    const rows = await sql`
      SELECT
        f.id,
        f.student_id,
        s.name AS student_name,
        f.fine_type,
        f.period_label,
        f.fine_amount,
        f.status,
        f.waive_reason,
        f.created_at
      FROM student_leave_fines f
      JOIN students s ON s.id = f.student_id
      WHERE (${studentId}::uuid IS NULL OR f.student_id = ${studentId}::uuid)
        AND (${status}::text IS NULL OR f.status = ${status}::text)
        AND (${period}::text IS NULL OR f.period_label = ${period}::text)
        ${cursor ? sql`AND f.created_at < ${cursor}::timestamptz` : sql``}
      ORDER BY f.created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const fines = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? fines[fines.length - 1].created_at : null;

    return NextResponse.json({ fines, nextCursor, hasMore });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
