import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { syncExistingPayrollRunFromAttendance } from "@/lib/payroll-sync";

// ── GET /api/admin/employees/attendance ────────────────────────────────
// Query params:
//   month=YYYY-MM          (required for monthly view)
//   departmentId=<uuid>    (optional filter)
//   employeeId=<uuid>      (optional — single employee)
//   date=YYYY-MM-DD        (optional — daily sheet view)
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "attendance", "view");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");        // "2025-05"
  const departmentId = searchParams.get("departmentId");
  const employeeId = searchParams.get("employeeId");
  const date = searchParams.get("date");

  try {
    // Build date range
    let startDate: string, endDate: string;
    if (date) {
      startDate = date;
      endDate = date;
    } else if (month) {
      const [y, m] = month.split("-").map(Number);
      startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    } else {
      return NextResponse.json({ error: "month or date param required" }, { status: 400 });
    }

    const records = await sql`
      SELECT
        a.id, 
        a.employee_id AS "employeeId", 
        a.date::text AS date, 
        a.status, 
        a.note,
        a.marked_by AS "markedBy", 
        a.created_at::text AS "createdAt", 
        a.updated_at::text AS "updatedAt",
        mb.full_name AS "markedByName",
        e.full_name AS "employeeName", 
        e.employee_code AS "employeeCode",
        d.id AS "deptId", 
        d.name AS "deptName"
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN admin_accounts mb ON mb.id = a.marked_by
      WHERE a.date BETWEEN ${startDate} AND ${endDate}
        ${employeeId ? sql`AND a.employee_id = ${employeeId}` : sql``}
        ${departmentId ? sql`AND e.department_id = ${departmentId}` : sql``}
      ORDER BY a.date ASC, e.full_name ASC
    `;

    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/admin/employees/attendance ───────────────────────────────
// Body: { employeeId, date, status, note? }
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "attendance", "create");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { employeeId, date, status, note } = body;

  if (!employeeId || !date || !status) {
    return NextResponse.json({ error: "employeeId, date, and status are required" }, { status: 400 });
  }
  const validStatuses = ["Present", "Absent", "Leave", "Half_Day", "Holiday"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  // Block marking attendance on Sundays
  const [yr, mo, dy] = date.split("-").map(Number);
  const parsedDate = new Date(yr, mo - 1, dy);
  if (parsedDate.getDay() === 0) {
    return NextResponse.json({ error: "Cannot mark attendance on Sundays; Sundays are auto-marked holidays" }, { status: 400 });
  }

  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  try {
    // Upsert — one record per employee per date
    const rows = await sql`
      INSERT INTO attendance (employee_id, date, status, note, marked_by)
      VALUES (${employeeId}, ${date}, ${status}, ${note || null}, ${adminId})
      ON CONFLICT (employee_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        note   = EXCLUDED.note,
        marked_by = EXCLUDED.marked_by,
        updated_at = NOW()
      RETURNING id
    `;

    await syncExistingPayrollRunFromAttendance(employeeId, date.slice(0, 7));

    return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE /api/admin/employees/attendance ─────────────────────────────
// Body: { id }
export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, "attendance", "delete");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const deleted = await sql`
      DELETE FROM attendance
      WHERE id = ${body.id}
      RETURNING employee_id, date::text as date
    `;

    if (deleted.length) {
      await syncExistingPayrollRunFromAttendance(deleted[0].employee_id, deleted[0].date.slice(0, 7));
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
