import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * PUT /api/admin/student-attendance/leave-requests/[id]
 * Body: { action: "approved" | "rejected", admin_note?: string }
 *
 * On approve: also upserts a Leave row in student_attendance.
 * On reject:  only updates the leave request status.
 */
export async function PUT(
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
  const body = await req.json();
  const { action, admin_note } = body as { action?: string; admin_note?: string };

  if (action !== "approved" && action !== "rejected") {
    return NextResponse.json({ error: "action must be 'approved' or 'rejected'" }, { status: 400 });
  }

  // Fetch the leave request
  const requestRows = await sql`
    SELECT id, student_id, date::text AS date, status
    FROM student_leave_requests
    WHERE id = ${id}
    LIMIT 1
  `;
  if (requestRows.length === 0) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }
  const leaveReq = requestRows[0];
  if (leaveReq.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });
  }

  try {
    // Update the leave request
    await sql`
      UPDATE student_leave_requests
      SET
        status      = ${action},
        reviewed_by = ${admin.adminId},
        reviewed_at = NOW(),
        admin_note  = ${admin_note?.trim() || null},
        updated_at  = NOW()
      WHERE id = ${id}
    `;

    // On approval: mark that day as Leave in student_attendance
    if (action === "approved") {
      await sql`
        INSERT INTO student_attendance (student_id, date, status, marked_by, updated_at)
        VALUES (
          ${leaveReq.student_id as string},
          ${leaveReq.date as string}::date,
          'Leave',
          ${admin.adminId},
          NOW()
        )
        ON CONFLICT (student_id, date) DO UPDATE
          SET status     = 'Leave',
              marked_by  = ${admin.adminId},
              updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`PUT /api/admin/student-attendance/leave-requests/${id}:`, err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
