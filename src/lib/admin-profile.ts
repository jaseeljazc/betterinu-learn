import { sql } from "@/lib/db";
import type { PayrollRunStatus } from "@/types";

export async function getLinkedEmployeeId(adminId: string) {
  if (adminId === "super_admin_bootstrap") {
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM employees
    WHERE admin_account_id = ${adminId}
    LIMIT 1
  `;

  return rows.length ? String(rows[0].id) : null;
}

export function mapPayrollRun(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    employeeId: r.employee_id as string,
    employee: {
      id: r.employee_id as string,
      employeeCode: r.employee_code as string,
      fullName: r.full_name as string,
      designation: (r.designation as string) || undefined,
      department: r.dept_name
        ? { id: r.dept_id as string, name: r.dept_name as string }
        : undefined,
    },
    month: r.month as string,
    workingDays: Number(r.working_days),
    daysPresent: Number(r.days_present),
    leaveCount: Number(r.leave_count),
    absentCount: Number(r.absent_count),
    halfDayCount: Number(r.half_day_count),
    lopLeaves: Number(r.lop_leaves),
    lopAbsences: Number(r.lop_absences),
    lopFullDays: Number(r.lop_full_days),
    lopHalfDays: Number(r.lop_half_days),
    dailyRate: Number(r.daily_rate),
    lopDeduction: Number(r.lop_deduction),
    grossSalary: Number(r.gross_salary),
    netSalary: Number(r.net_salary),
    status: r.status as PayrollRunStatus,
    disbursedAt: (r.disbursed_at as string) || undefined,
    transactionId: (r.transaction_id as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function buildPayslipData(r: Record<string, unknown>) {
  const [year, monthNum] = (r.month as string).split("-");
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(monthNum, 10) - 1, 1);
  const formattedMonth = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);

  const dailyRate = Number(r.daily_rate);
  const lopAbsences = Number(r.lop_absences);
  const lopLeaves = Number(r.lop_leaves);
  const halfDayPairs = Math.floor(Number(r.half_day_count) / 2);
  const lopHalfDays = Number(r.lop_half_days);
  const deductions = [];

  if (lopAbsences > 0) {
    deductions.push({
      label: `Loss of pay - absences (${lopAbsences} days @ Rs ${dailyRate.toFixed(2)}/day)`,
      amount: Number((lopAbsences * dailyRate).toFixed(2)),
    });
  }

  if (lopLeaves > 0) {
    deductions.push({
      label: `Loss of pay - excess leaves (${lopLeaves} days @ Rs ${dailyRate.toFixed(2)}/day)`,
      amount: Number((lopLeaves * dailyRate).toFixed(2)),
    });
  }

  if (halfDayPairs > 0) {
    deductions.push({
      label: `Loss of pay - half day pairs (${halfDayPairs} days @ Rs ${dailyRate.toFixed(2)}/day)`,
      amount: Number((halfDayPairs * dailyRate).toFixed(2)),
    });
  }

  if (lopHalfDays > 0) {
    deductions.push({
      label: `Loss of pay - half day (0.5 days @ Rs ${dailyRate.toFixed(2)}/day)`,
      amount: Number((lopHalfDays * dailyRate).toFixed(2)),
    });
  }

  return {
    employee: {
      fullName: r.full_name as string,
      employeeCode: r.employee_code as string,
      designation: (r.designation as string) || undefined,
      department: (r.dept_name as string) || undefined,
      dateOfJoining: (r.date_of_joining as string) || undefined,
    },
    month: formattedMonth,
    attendance: {
      workingDays: Number(r.working_days),
      daysPresent: Number(r.days_present),
      leaveCount: Number(r.leave_count),
      absentCount: Number(r.absent_count),
      halfDayCount: Number(r.half_day_count),
      freeCL: 1,
      lopLeaves,
      lopAbsences,
      lopFullDays: Number(r.lop_full_days),
      lopHalfDays,
    },
    earnings: [{ label: "Basic salary", amount: Number(r.gross_salary) }],
    deductions,
    grossSalary: Number(r.gross_salary),
    totalDeductions: Number(r.lop_deduction),
    netSalary: Number(r.net_salary),
    status: r.status as PayrollRunStatus,
    disbursedAt: (r.disbursed_at as string) || undefined,
  };
}
