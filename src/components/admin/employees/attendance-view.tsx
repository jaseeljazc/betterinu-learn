"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserX, Clock, Gift, Lock } from "lucide-react";
import { AttendanceModal } from "./attendance-modal";
import { toast } from "sonner";

type Department = { id: string; name: string };
export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  note?: string;
  markedByName?: string;
  employeeName: string;
  employeeCode: string;
  deptId?: string;
  deptName?: string;
};
type Employee = {
  id: string;
  fullName: string;
  employeeCode: string;
  deptName?: string;
  deptId?: string;
};

interface Props {
  canMark: boolean;
  canEdit: boolean;
}

const ALL = "__all__";

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDayCategoryForRecord(
  dateStr: string,
  byDate: Map<string, AttendanceRecord>
): "leave" | "holiday_off" | "working" {
  const record = byDate.get(dateStr)
  const status = record?.status
  if (status === "Leave") return "leave"
  if (status === "Present" || status === "Absent" || status === "Half_Day")
    return "working"
  const [y, mo, d] = dateStr.split("-").map(Number)
  const date = new Date(y, mo - 1, d)
  if (date.getDay() === 0 || status === "Holiday") return "holiday_off"
  return "working"
}

function shouldHolidayBeLeave(
  dateStr: string,
  byDate: Map<string, AttendanceRecord>
): boolean {
  const [y, mo, d] = dateStr.split("-").map(Number)

  function offsetDate(base: Date, days: number): string {
    const nd = new Date(base)
    nd.setDate(nd.getDate() + days)
    return `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`
  }

  // Walk left to find start of contiguous block
  let startDate = new Date(y, mo - 1, d)
  for (let i = 0; i < 20; i++) {
    const prevStr = offsetDate(startDate, -1)
    const prevCat = getDayCategoryForRecord(prevStr, byDate)
    if (prevCat === "leave" || prevCat === "holiday_off") {
      startDate = new Date(startDate)
      startDate.setDate(startDate.getDate() - 1)
    } else {
      break
    }
  }

  // Walk right to find end of contiguous block
  let endDate = new Date(y, mo - 1, d)
  for (let i = 0; i < 20; i++) {
    const nextStr = offsetDate(endDate, 1)
    const nextCat = getDayCategoryForRecord(nextStr, byDate)
    if (nextCat === "leave" || nextCat === "holiday_off") {
      endDate = new Date(endDate)
      endDate.setDate(endDate.getDate() + 1)
    } else {
      break
    }
  }

  const blockLength =
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1

  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`

  const startsWithLeave = getDayCategoryForRecord(startStr, byDate) === "leave"
  const endsWithLeave = getDayCategoryForRecord(endStr, byDate) === "leave"

  return (startsWithLeave || endsWithLeave) && blockLength >= 3
}

export function AttendanceView({ canMark, canEdit }: Props) {
  const today = new Date();
  const todayDate = toDateKey(today);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [month, setMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [lockedEmployeeIds, setLockedEmployeeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    employeeId?: string;
    employeeName?: string;
    date?: string;
  }>({ open: false });

  useEffect(() => {
    fetch("/api/admin/employees/departments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments ?? []));
  }, []);

  const fetchLocks = useCallback(() => {
    fetch(`/api/admin/payroll?month=${month}&status=disbursed`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.runs || []).map((r: any) => r.employeeId));
        setLockedEmployeeIds(ids);
      });
  }, [month]);

  useEffect(() => { fetchLocks(); }, [fetchLocks]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
  }, [filterDept]);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees/attendance?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .finally(() => setLoading(false));
  }, [month, filterDept]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const fetchTodayRecords = useCallback(() => {
    setTodayLoading(true);
    const params = new URLSearchParams({ date: todayDate });
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees/attendance?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTodayRecords(d.records ?? []))
      .finally(() => setTodayLoading(false));
  }, [todayDate, filterDept]);

  useEffect(() => { fetchTodayRecords(); }, [fetchTodayRecords]);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function isWeekend(day: number) {
    const dow = new Date(y, m - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  function getDayLabel(day: number) {
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(y, m - 1, day).getDay()];
  }

  function getRecord(empId: string, day: number) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.employeeId === empId && r.date === dateStr);
  }

  async function handleBulkMark(day: number, status: string) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const eligibleEmployees = employees.filter((emp) => {
      const isLocked = lockedEmployeeIds.has(emp.id);
      const isSunday = new Date(y, m - 1, day).getDay() === 0;
      return !isLocked && !isSunday;
    });
    try {
      const res = await fetch("/api/admin/employees/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: dateStr,
          employeeIds: eligibleEmployees.map((e) => e.id),
          status,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to bulk mark attendance");
      }
      fetchRecords();
      fetchTodayRecords();
      toast.success(`Marked ${eligibleEmployees.length} employees as ${status.replace("_", " ")} for day ${day}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk mark attendance");
    }
  }

  const present = todayRecords.filter((r) => r.status === "Present").length;
  const absent = todayRecords.filter((r) => r.status === "Absent").length;
  const leave = todayRecords.filter((r) => r.status === "Leave").length;
  const holiday = todayRecords.filter((r) => r.status === "Holiday").length;
  const halfday = todayRecords.filter((r) => r.status === "Half_Day").length;

  const STATUS_CFG: Record<string, { short: string; cls: string; ring: string }> = {
    Present: { short: "P", cls: "bg-green-500 text-white", ring: "ring-green-300" },
    Absent: { short: "A", cls: "bg-red-500 text-white", ring: "ring-red-300" },
    Leave: { short: "L", cls: "bg-amber-500 text-white", ring: "ring-amber-300" },
    Half_Day: { short: "HD", cls: "bg-blue-500 text-white", ring: "ring-blue-300" },
    Holiday: { short: "H", cls: "bg-purple-500 text-white", ring: "ring-purple-300" },
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-xl border border-default bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Select
            value={filterDept || ALL}
            onValueChange={(v) => setFilterDept(v === ALL ? "" : v)}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canMark && (
          <Button onClick={() => setModal({ open: true })}>
            <Plus className="size-4" /> Mark Attendance
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">Today: {todayDate}</p>
        {todayLoading && <p className="text-xs font-medium text-muted">Updating...</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Present", count: present, Icon: Users, color: "bg-green-50 text-green-700 border-green-200" },
          { label: "Absent", count: absent, Icon: UserX, color: "bg-red-50 text-red-600 border-red-200" },
          { label: "Leave", count: leave, Icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Half-Day", count: halfday, Icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Holiday", count: holiday, Icon: Gift, color: "bg-purple-50 text-purple-700 border-purple-200" },
        ].map(({ label, count, Icon, color }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}>
            <Icon className="size-5 shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-extrabold leading-none">{count}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(STATUS_CFG) as [string, { short: string; cls: string }][]).map(([label, cfg]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-secondary">
            <span className={`inline-flex items-center justify-center size-5 rounded text-[10px] font-bold ${cfg.cls}`}>
              {cfg.short}
            </span>
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-5 rounded text-[10px] font-bold bg-subtle text-muted">—</span>
          Weekend
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-5 rounded border border-dashed border-default text-[10px] text-muted" />
          Not marked
        </span>
        {canMark && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            · Click a day number to bulk mark all employees
          </span>
        )}
      </div>

      {/* Attendance grid */}
      <div className="rounded-2xl border border-default bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted text-sm animate-pulse">
            Loading attendance data…
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
            <Users className="size-10 opacity-25" />
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-default/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-default/50">
            <table className="border-collapse text-xs w-full">
              <thead>
                <tr className="bg-subtle/60 border-b border-default sticky top-0 z-10">
                  <th className="sticky left-0 z-20 bg-subtle/90 backdrop-blur text-left px-4 py-2.5 text-xs font-bold text-foreground border-r border-default min-w-[200px] w-[200px]">
                    Employee
                  </th>
                  {days.map((day) => {
                    const isSunday = new Date(y, m - 1, day).getDay() === 0
                    const isToday =
                      y === today.getFullYear() &&
                      m === today.getMonth() + 1 &&
                      day === today.getDate()

                    return (
                      <th
                        key={day}
                        className={`px-0 py-0 text-center font-bold border-r border-default last:border-r-0 min-w-[34px] w-[34px] ${
                          isToday
                            ? "bg-primary/10 text-primary border-x-primary/20"
                            : isWeekend(day)
                              ? "text-muted/60"
                              : "text-foreground"
                        }`}
                      >
                        {canMark && !isSunday ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`flex flex-col items-center py-1.5 gap-0.5 w-full hover:bg-primary/5 transition-colors group cursor-pointer ${isToday ? "text-primary font-black" : ""}`}>
                                <span className="group-hover:text-primary transition-colors">{day}</span>
                                <span className={`text-[9px] font-normal ${isToday ? "text-primary/80" : isWeekend(day) ? "text-muted/50" : "text-muted"}`}>
                                  {getDayLabel(day)}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="min-w-36">
                              <p className="px-2 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wide">
                                Mark all as
                              </p>
                              {Object.entries(STATUS_CFG).map(([status, cfg]) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleBulkMark(day, status)}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  <span className={`inline-flex items-center justify-center size-5 rounded text-[10px] font-bold ${cfg.cls}`}>
                                    {cfg.short}
                                  </span>
                                  {status.replace("_", " ")}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className={`flex flex-col items-center py-1.5 gap-0.5 ${isToday ? "text-primary font-black" : ""}`}>
                            <span>{day}</span>
                            <span className={`text-[9px] font-normal ${isToday ? "text-primary/80" : isWeekend(day) ? "text-muted/50" : "text-muted"}`}>
                              {getDayLabel(day)}
                            </span>
                          </div>
                        )}
                      </th>
                    )
                  })}
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">P</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">A</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">L</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">HD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {employees.map((emp, idx) => {
                  const empRecs = records.filter((r) => r.employeeId === emp.id)
                  const empByDate = new Map(empRecs.map((r) => [r.date, r]))

                  let present = 0
                  let absent = 0
                  let leave = 0
                  let halfDay = 0

                  for (let dayVal = 1; dayVal <= daysInMonth; dayVal++) {
                    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`
                    const date = new Date(y, m - 1, dayVal)
                    const record = empByDate.get(dateStr)
                    const status = record?.status

                    const isSunday = date.getDay() === 0
                    const isHolidayOrSunday =
                      (isSunday || status === "Holiday") &&
                      status !== "Present" &&
                      status !== "Absent" &&
                      status !== "Half_Day"

                    if (isHolidayOrSunday) {
                      if (shouldHolidayBeLeave(dateStr, empByDate)) {
                        leave++
                      }
                      continue
                    }

                    if (status === "Present") present++
                    else if (status === "Absent") absent++
                    else if (status === "Leave") leave++
                    else if (status === "Half_Day") halfDay++
                  }

                  const summary = {
                    Present: present,
                    Absent: absent,
                    Leave: leave,
                    Half_Day: halfDay,
                  }

                  return (
                    <tr key={emp.id} className={idx % 2 === 0 ? "bg-white" : "bg-elevated"}>
                      <td className={`sticky left-0 z-10 border-r border-default px-4 py-2 ${idx % 2 === 0 ? "bg-white" : "bg-elevated"}`}>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground truncate max-w-[140px]">{emp.fullName}</p>
                          {lockedEmployeeIds.has(emp.id) && (
                            <Lock className="size-3 text-red-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted">{emp.employeeCode}</p>
                      </td>

                      {days.map((day) => {
                        const weekend = isWeekend(day)
                        const isSunday = new Date(y, m - 1, day).getDay() === 0
                        const rec = getRecord(emp.id, day)
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        const isToday =
                          y === today.getFullYear() &&
                          m === today.getMonth() + 1 &&
                          day === today.getDate()

                        const isHolidayOrSunday =
                          (isSunday || rec?.status === "Holiday") &&
                          rec?.status !== "Present" &&
                          rec?.status !== "Absent" &&
                          rec?.status !== "Half_Day"

                        const isSandwichedLeave =
                          isHolidayOrSunday && shouldHolidayBeLeave(dateStr, empByDate)

                        const cfg = isSandwichedLeave
                          ? STATUS_CFG["Leave"]
                          : isSunday
                            ? STATUS_CFG["Holiday"]
                            : rec
                              ? STATUS_CFG[rec.status as keyof typeof STATUS_CFG]
                              : null
                        const isLocked = lockedEmployeeIds.has(emp.id)

                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-1 text-center border-r border-default/50 last:border-r-0 ${isToday ? "bg-primary/[0.04]" : ""}`}
                            title={
                              (isToday ? "Today · " : "") +
                              (isSunday
                                ? isSandwichedLeave
                                  ? "Sunday (Leave - Sandwich)"
                                  : "Sunday (Holiday)"
                                : isSandwichedLeave
                                  ? "Holiday (Leave - Sandwich)"
                                  : isLocked
                                    ? "Payroll disbursed (Locked)"
                                    : rec
                                      ? `${rec.status}${rec.note ? ` — ${rec.note}` : ""}`
                                      : weekend ? "Click to mark (Weekend)" : "Click to mark")
                            }
                          >
                            <button
                              disabled={!canMark || isLocked || isSunday}
                              onClick={() =>
                                canMark && !isLocked && !isSunday &&
                                setModal({
                                  open: true,
                                  employeeId: emp.id,
                                  employeeName: emp.fullName,
                                  date: dateStr,
                                })
                              }
                              className={[
                                "mx-auto size-[26px] rounded flex items-center justify-center text-[11px] font-bold transition-all",
                                isLocked || isSunday
                                  ? (cfg ? `${cfg.cls} opacity-80 cursor-not-allowed` : "border border-dashed border-default/40 text-muted/40 cursor-not-allowed")
                                  : cfg
                                    ? `${cfg.cls} hover:opacity-75 cursor-pointer`
                                    : canMark
                                      ? `border border-dashed ${weekend ? "border-purple-200 hover:border-primary bg-purple-50/30" : "border-default"} hover:border-primary hover:bg-primary/5 cursor-pointer`
                                      : "border border-dashed border-default/40 cursor-default",
                                isToday ? "ring-2 ring-primary ring-offset-1" : "",
                              ].join(" ")}
                            >
                              {isLocked && !cfg ? <Lock className="size-3" /> : (cfg?.short ?? "")}
                            </button>
                          </td>
                        )
                      })}

                      <td className="px-2 py-2 text-center font-bold text-green-700 border-l border-default bg-green-50/30">{summary.Present}</td>
                      <td className="px-2 py-2 text-center font-bold text-red-600 border-l border-default bg-red-50/30">{summary.Absent}</td>
                      <td className="px-2 py-2 text-center font-bold text-amber-700 border-l border-default bg-amber-50/30">{summary.Leave}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700 border-l border-default bg-blue-50/30">{summary.Half_Day}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <AttendanceModal
          employeeId={modal.employeeId}
          employeeName={modal.employeeName}
          date={modal.date}
          existingRecord={records.find(
            (r) => r.employeeId === modal.employeeId && r.date === modal.date,
          )}
          canEdit={canEdit}
          onClose={() => setModal({ open: false })}
          onSaved={() => {
            setModal({ open: false });
            fetchRecords();
            fetchTodayRecords();
          }}
        />
      )}
    </div>
  );
}