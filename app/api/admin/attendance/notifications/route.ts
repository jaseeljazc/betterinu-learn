import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";

/**
 * GET  /api/admin/attendance/notifications — list attendance alerts for calling admin
 * PATCH /api/admin/attendance/notifications — mark all as read
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT
        an.id,
        an.message,
        an.action_url,
        an.ip_address,
        an.is_read,
        an.created_at,
        s.name   AS student_name,
        s.email  AS student_email,
        sa.punch_in,
        sa.punch_out
      FROM attendance_notifications an
      JOIN students s          ON s.id  = an.student_id
      JOIN student_attendance sa ON sa.id = an.attendance_id
      WHERE an.recipient_id = ${session.adminId}
      ORDER BY an.created_at DESC
      LIMIT 50
    `;

    const unreadCount = rows.filter((r: any) => !r.is_read).length;

    return NextResponse.json({ success: true, data: rows, unreadCount });
  } catch (err: any) {
    console.error("GET /api/admin/attendance/notifications:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    await sql`
      UPDATE attendance_notifications
      SET is_read = TRUE
      WHERE recipient_id = ${session.adminId}
        AND is_read = FALSE
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/admin/attendance/notifications:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
