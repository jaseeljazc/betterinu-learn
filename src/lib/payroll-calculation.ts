import { format, getDaysInMonth, isSunday } from "date-fns";

export type PayrollAttendanceRecord = {
  date: string;
  status: string;
};

export type PayrollCalculation = {
  workingDays: number;
  daysPresent: number;
  leaveCount: number;
  absentCount: number;
  halfDayCount: number;
  lopLeaves: number;
  lopAbsences: number;
  lopFullDays: number;
  lopHalfDays: number;
  dailyRate: number;
  lopDeduction: number;
  grossSalary: number;
  netSalary: number;
};

export function getPayrollMonthRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number.parseInt(yearStr, 10);
  const monthNum = Number.parseInt(monthStr, 10);
  const daysInMonth = getDaysInMonth(new Date(year, monthNum - 1));

  return {
    year,
    monthNum,
    daysInMonth,
    monthStart: `${month}-01`,
    monthEnd: `${month}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

export function calculatePayrollFromAttendance(
  month: string,
  monthlySalaryValue: unknown,
  attendanceRecords: PayrollAttendanceRecord[],
): PayrollCalculation {
  const { year, monthNum, daysInMonth } = getPayrollMonthRange(month);
  const attendanceByDate = new Map(attendanceRecords.map((record) => [record.date, record.status]));

  function isSandwiched(targetDate: Date): boolean {
    // 1. Look left for the closest active working day
    let leftDate = new Date(targetDate);
    let leftStatus: string | undefined;
    let limit = 0;
    while (limit < 10) {
      limit++;
      leftDate.setDate(leftDate.getDate() - 1);
      const leftDateStr = format(leftDate, "yyyy-MM-dd");
      const leftStatusTemp = attendanceByDate.get(leftDateStr);
      if (isSunday(leftDate) || leftStatusTemp === "Holiday") {
        continue;
      }
      leftStatus = leftStatusTemp;
      break;
    }

    // 2. Look right for the closest active working day
    let rightDate = new Date(targetDate);
    let rightStatus: string | undefined;
    limit = 0;
    while (limit < 10) {
      limit++;
      rightDate.setDate(rightDate.getDate() + 1);
      const rightDateStr = format(rightDate, "yyyy-MM-dd");
      const rightStatusTemp = attendanceByDate.get(rightDateStr);
      if (isSunday(rightDate) || rightStatusTemp === "Holiday") {
        continue;
      }
      rightStatus = rightStatusTemp;
      break;
    }

    return leftStatus === "Leave" && rightStatus === "Leave";
  }

  let workingDays = 0;
  let daysPresent = 0;
  let leaveCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthNum - 1, day);
    const dateStr = format(date, "yyyy-MM-dd");
    const status = attendanceByDate.get(dateStr);

    if (isSunday(date) || status === "Holiday") {
      if (isSandwiched(date)) {
        leaveCount++;
      }
      continue;
    }

    workingDays++;

    if (status === "Present") {
      daysPresent++;
    } else if (status === "Absent") {
      absentCount++;
    } else if (status === "Leave") {
      leaveCount++;
    } else if (status === "Half_Day") {
      halfDayCount++;
    }
  }

  const monthlySalary = Number(monthlySalaryValue) || 0;
  const dailyRate = workingDays > 0 ? Math.floor(monthlySalary / workingDays) : 0;
  const halfDayPairs = Math.floor(halfDayCount / 2);
  const leftoverHalf = halfDayCount % 2;
  const lopLeaves = Math.max(0, leaveCount - 1);
  const lopAbsences = absentCount;
  const lopFullDays = lopLeaves + lopAbsences + halfDayPairs;
  const lopHalfDays = leaveCount === 0 && absentCount === 0 && leftoverHalf === 1 ? 0 : leftoverHalf * 0.5;
  const lopDeduction = Number(((lopFullDays * dailyRate) + (lopHalfDays * dailyRate)).toFixed(2));
  const grossSalary = monthlySalary;
  const netSalary = Math.max(0, grossSalary - lopDeduction);

  return {
    workingDays,
    daysPresent,
    leaveCount,
    absentCount,
    halfDayCount,
    lopLeaves,
    lopAbsences,
    lopFullDays,
    lopHalfDays,
    dailyRate,
    lopDeduction,
    grossSalary,
    netSalary,
  };
}
