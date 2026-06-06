import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStudentLeaveFineSettings } from "@/lib/app-settings";
import type { StudentLeaveFineSettings } from "@/lib/app-settings";

async function checkAndGenerateFine(
  studentId: string,
  leaveRequestId: string,
  approvedDate: string,
  settings: StudentLeaveFineSettings
): Promise<{ fineGenerated: boolean; fineAmount: number; periodLabel: string } | null> {
  if (!settings.enabled) return null;

  const [year, month] = approvedDate.split("-");
  const periodLabel =
    settings.fine_period === "monthly" ? `${year}-${month}` : year;

  const countResult =
    settings.fine_period === "monthly"
      ? await sql`
          SELECT COUNT(*) AS count FROM student_leave_requests
          WHERE student_id = ${studentId}
            AND status = 'approved'
            AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
        `
      : await sql`
          SELECT COUNT(*) AS count FROM student_leave_requests
          WHERE student_id = ${studentId}
            AND status = 'approved'
            AND TO_CHAR(date, 'YYYY') = ${periodLabel}
        `;

  const count = Number(countResult[0].count);
  if (count > settings.free_leaves_per_period) {
    await sql`
      INSERT INTO student_leave_fines
        (student_id, leave_request_id, period_label, fine_amount, status, fine_type)
      VALUES
        (${studentId}, ${leaveRequestId}, ${periodLabel}, ${settings.fine_amount}, 'pending', 'leave')
      ON CONFLICT (leave_request_id) WHERE fine_type = 'leave' AND leave_request_id IS NOT NULL DO NOTHING
    `;
    return {
      fineGenerated: true,
      fineAmount: settings.fine_amount,
      periodLabel,
    };
  }
  return null;
}

/**
 * PUT /api/admin/student-attendance/leave-requests/[id]
 * Body: { action: "approved" | "rejected", admin_note?: string }
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

      // Waive any pending absent fines for this date (retroactive leave approval)
      await sql`
        UPDATE student_leave_fines
        SET status = 'waived',
            waive_reason = 'Retroactive leave approved',
            updated_at = NOW()
        WHERE student_id = ${leaveReq.student_id}
          AND fine_type = 'absent'
          AND period_label = ${leaveReq.date}
          AND status = 'pending'
      `;

      const settings = await getStudentLeaveFineSettings();
      
      // Only generate fine if fine_on = "approved" (current implementation)
      // Note: fine_on = "applied" is not yet implemented (would require logic in apply route)
      if (settings.fine_on === "approved") {
        const fineInfo = await checkAndGenerateFine(
          leaveReq.student_id as string,
          id,
          leaveReq.date as string,
          settings
        );

        if (fineInfo) {
          return NextResponse.json({
            ok: true,
            warning: `Fine generated: ₹${fineInfo.fineAmount} for period ${fineInfo.periodLabel}. Student has exceeded their free leave quota.`
          });
        }
      }
    }

    if (action === "rejected") {
      await sql`
        UPDATE student_leave_fines
        SET status = 'waived',
            waive_reason = 'Leave request was rejected',
            updated_at = NOW()
        WHERE leave_request_id = ${id} AND status = 'pending'
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`PUT /api/admin/student-attendance/leave-requests/${id}:`, err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
