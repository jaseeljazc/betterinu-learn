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

  function getDayCategoryForDate(date: Date): 'leave' | 'holiday_off' | 'working' {
    const dateStr = format(date, "yyyy-MM-dd");
    const status = attendanceByDate.get(dateStr);
    if (status === "Leave") return 'leave';
    if (status === "Present" || status === "Absent" || status === "Half_Day") return 'working';
    if (isSunday(date) || status === "Holiday") return 'holiday_off';
    return 'working';
  }

  function shouldHolidayBeLeave(targetDate: Date): boolean {
    // Traverse left to find the start of the contiguous block of non-working days
    let start = new Date(targetDate);
    let limit = 0;
    while (limit < 20) {
      limit++;
      const prev = new Date(start);
      prev.setDate(prev.getDate() - 1);
      const prevCat = getDayCategoryForDate(prev);
      if (prevCat === 'leave' || prevCat === 'holiday_off') {
        start = prev;
      } else {
        break;
      }
    }

    // Traverse right to find the end of the contiguous block of non-working days
    let end = new Date(targetDate);
    limit = 0;
    while (limit < 20) {
      limit++;
      const next = new Date(end);
      next.setDate(next.getDate() + 1);
      const nextCat = getDayCategoryForDate(next);
      if (nextCat === 'leave' || nextCat === 'holiday_off') {
        end = next;
      } else {
        break;
      }
    }

    // Length of the continuous block
    const blockLength = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check if the block starts or ends with a leave day
    const startsWithLeave = getDayCategoryForDate(start) === 'leave';
    const endsWithLeave = getDayCategoryForDate(end) === 'leave';

    // It counts as leave if it starts or ends with a leave day and the block has 3 or more consecutive days
    return (startsWithLeave || endsWithLeave) && blockLength >= 3;
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

    const isHolidayOrSunday = (isSunday(date) || status === "Holiday") && status !== "Present" && status !== "Absent" && status !== "Half_Day";

    if (isHolidayOrSunday) {
      if (status === "Leave" || shouldHolidayBeLeave(date)) {
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
