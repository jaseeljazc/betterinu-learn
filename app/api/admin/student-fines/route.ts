import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/student-fines
 * Query: ?studentId=uuid  ?status=pending|paid|waived  ?period=YYYY-MM
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const period = searchParams.get("period");

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
      ORDER BY f.created_at DESC
    `;
    return NextResponse.json({ fines: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
