import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-rbac";
import { getLinkedEmployeeId } from "@/lib/admin-profile";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;

  const employeeId = await getLinkedEmployeeId(auth.adminId);
  if (!employeeId) {
    return NextResponse.json({ error: "No employee record linked to your account." }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const records = await sql`
    SELECT
      a.id,
      a.employee_id AS "employeeId",
      a.date::text AS date,
      a.status,
      a.note,
      a.marked_by AS "markedBy",
      a.created_at::text AS "createdAt",
      a.updated_at::text AS "updatedAt"
    FROM attendance a
    WHERE a.employee_id = ${employeeId}
      AND a.date BETWEEN ${startDate} AND ${endDate}
    ORDER BY a.date ASC
  `;

  return NextResponse.json({ records, month });
}
