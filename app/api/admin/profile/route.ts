import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-rbac";
import { getLinkedEmployeeId } from "@/lib/admin-profile";
import { sql } from "@/lib/db";
import { generateViewPresignedUrl } from "@/lib/s3-private";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;

  const employeeId = await getLinkedEmployeeId(auth.adminId);
  if (!employeeId) {
    return NextResponse.json({
      employee: null,
      message: "No employee record linked to your account.",
    });
  }

  const rows = await sql`
    SELECT
      e.id, e.employee_code, e.full_name, e.email, e.phone,
      e.date_of_birth::text as date_of_birth, e.gender, e.address, e.profile_photo_key,
      e.designation, e.employment_type, e.monthly_salary, e.date_of_joining::text as date_of_joining,
      e.status, e.admin_account_id, e.created_at::text as created_at,
      d.id AS dept_id, d.name AS dept_name, d.is_active AS dept_active,
      rm.id AS manager_id, rm.full_name AS manager_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
    WHERE e.id = ${employeeId}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({
      employee: null,
      message: "No employee record linked to your account.",
    });
  }

  const r = rows[0];
  return NextResponse.json({
    employee: {
      id: r.id,
      employeeCode: r.employee_code,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone ?? undefined,
      dateOfBirth: r.date_of_birth ?? undefined,
      gender: r.gender ?? undefined,
      address: r.address ?? undefined,
      profilePhotoKey: r.profile_photo_key ?? undefined,
      profilePhotoUrl: r.profile_photo_key
        ? await generateViewPresignedUrl(r.profile_photo_key as string)
        : undefined,
      designation: r.designation ?? undefined,
      employmentType: r.employment_type,
      monthlySalary: Number(r.monthly_salary),
      dateOfJoining: r.date_of_joining ?? undefined,
      status: r.status,
      adminAccountId: r.admin_account_id ?? undefined,
      createdAt: r.created_at,
      department: r.dept_id
        ? { id: r.dept_id, name: r.dept_name, isActive: r.dept_active }
        : undefined,
      reportingManager: r.manager_id
        ? { id: r.manager_id, fullName: r.manager_name }
        : undefined,
    },
  });
}
