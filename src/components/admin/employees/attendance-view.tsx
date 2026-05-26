"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, UserX, Clock, Gift, Lock } from "lucide-react";
import { AttendanceModal } from "./attendance-modal";

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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  // Load departments
  useEffect(() => {
    fetch("/api/admin/employees/departments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments ?? []));
  }, []);

  // Load disbursed payroll runs for lock state
  const fetchLocks = useCallback(() => {
    fetch(`/api/admin/payroll?month=${month}&status=disbursed`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const ids = new Set<string>((d.runs || []).map((r: any) => r.employeeId));
        setLockedEmployeeIds(ids);
      });
  }, [month]);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  // Load employees
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
  }, [filterDept]);

  // Load attendance records
  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees/attendance?${params}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .finally(() => setLoading(false));
  }, [month, filterDept]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const fetchTodayRecords = useCallback(() => {
    setTodayLoading(true);
    const params = new URLSearchParams({ date: todayDate });
    if (filterDept) params.set("departmentId", filterDept);
    fetch(`/api/admin/employees/attendance?${params}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setTodayRecords(d.records ?? []))
      .finally(() => setTodayLoading(false));
  }, [todayDate, filterDept]);

  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // Build day array for the month
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Keep as-is for header styling
  function isWeekend(day: number) {
    const dow = new Date(y, m - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  function getDayLabel(day: number) {
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][
      new Date(y, m - 1, day).getDay()
    ];
  }

  function getRecord(empId: string, day: number) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.employeeId === empId && r.date === dateStr);
  }

  // Summary stats
  const present = todayRecords.filter((r) => r.status === "Present").length;
  const absent = todayRecords.filter((r) => r.status === "Absent").length;
  const leave = todayRecords.filter((r) => r.status === "Leave").length;
  const holiday = todayRecords.filter((r) => r.status === "Holiday").length;
  const halfday = todayRecords.filter((r) => r.status === "Half_Day").length;

  const STATUS_CFG: Record<string, { short: string; cls: string; ring: string }> = {
    Present: {
      short: "P",
      cls: "bg-green-500 text-white",
      ring: "ring-green-300",
    },
    Absent: { short: "A", cls: "bg-red-500 text-white", ring: "ring-red-300" },
    Leave: {
      short: "L",
      cls: "bg-amber-500 text-white",
      ring: "ring-amber-300",
    },
    Half_Day: {
      short: "HD",
      cls: "bg-blue-500 text-white",
      ring: "ring-blue-300",
    },
    Holiday: {
      short: "H",
      cls: "bg-purple-500 text-white",
      ring: "ring-purple-300",
    },
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
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canMark && (
          <button
            onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all"
          >
            <Plus className="size-4" /> Mark Attendance
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">Today: {todayDate}</p>
        {todayLoading && <p className="text-xs font-medium text-muted">Updating...</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Present",
            count: present,
            Icon: Users,
            color: "bg-green-50 text-green-700 border-green-200",
          },
          {
            label: "Absent",
            count: absent,
            Icon: UserX,
            color: "bg-red-50 text-red-600 border-red-200",
          },
          {
            label: "Leave",
            count: leave,
            Icon: Clock,
            color: "bg-amber-50 text-amber-700 border-amber-200",
          },
          {
            label: "Half-Day",
            count: halfday,
            Icon: Clock,
            color: "bg-blue-50 text-blue-700 border-blue-200",
          },
          {
            label: "Holiday",
            count: holiday,
            Icon: Gift,
            color: "bg-purple-50 text-purple-700 border-purple-200",
          },
        ].map(({ label, count, Icon, color }) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}
          >
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
        {(
          Object.entries(STATUS_CFG) as [
            string,
            { short: string; cls: string },
          ][]
        ).map(([label, cfg]) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs font-medium text-secondary"
          >
            <span
              className={`inline-flex items-center justify-center size-5 rounded text-[10px] font-bold ${cfg.cls}`}
            >
              {cfg.short}
            </span>
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-5 rounded text-[10px] font-bold bg-subtle text-muted">
            —
          </span>
          Weekend
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-5 rounded border border-dashed border-default text-[10px] text-muted" />
          Not marked
        </span>
      </div>

      {/* Excel-style attendance grid */}
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
<div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-default/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-default/50">            <table className="border-collapse text-xs w-full">
              <thead>
                {/* Day numbers row */}
                <tr className="bg-subtle/60 border-b border-default sticky top-0 z-10">
                  <th className="sticky left-0 z-20 bg-subtle/90 backdrop-blur text-left px-4 py-2.5 text-xs font-bold text-foreground border-r border-default min-w-[200px] w-[200px]">
                    Employee
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`px-0 py-0 text-center font-bold border-r border-default last:border-r-0 min-w-[34px] w-[34px] ${
                        isWeekend(day) ? "text-muted/60" : "text-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center py-1.5 gap-0.5">
                        <span>{day}</span>
                        <span
                          className={`text-[9px] font-normal ${isWeekend(day) ? "text-muted/50" : "text-muted"}`}
                        >
                          {getDayLabel(day)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">
                    P
                  </th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">
                    A
                  </th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">
                    L
                  </th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">
                    HD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {employees.map((emp, idx) => {
                  const empRecs = records.filter(
                    (r) => r.employeeId === emp.id,
                  );
                  const summary = {
                    Present: empRecs.filter((r) => r.status === "Present")
                      .length,
                    Absent: empRecs.filter((r) => r.status === "Absent").length,
                    Leave: empRecs.filter((r) => r.status === "Leave").length,
                    Half_Day: empRecs.filter((r) => r.status === "Half_Day")
                      .length,
                  };
                  return (
                    <tr
                      key={emp.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-elevated"}
                    >
                      {/* Employee name — sticky first column */}
                      <td
                        className={`sticky left-0 z-10 border-r border-default px-4 py-2 ${idx % 2 === 0 ? "bg-white" : "bg-elevated"}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground truncate max-w-[140px]">
                            {emp.fullName}
                          </p>
                          {lockedEmployeeIds.has(emp.id) && (
                            <Lock className="size-3 text-red-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted">
                          {emp.employeeCode}
                        </p>
                      </td>

                      {/* Day cells */}
                      {days.map((day) => {
                        const weekend = isWeekend(day);
                        const isSunday = new Date(y, m - 1, day).getDay() === 0;
                        const rec = getRecord(emp.id, day);
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const cfg = isSunday
                          ? STATUS_CFG["Holiday"]
                          : rec
                            ? STATUS_CFG[rec.status as keyof typeof STATUS_CFG]
                            : null;

                        const isLocked = lockedEmployeeIds.has(emp.id);

                        return (
                          <td
                            key={day}
                            className="px-0.5 py-1 text-center border-r border-default/50 last:border-r-0"
                            title={
                              isSunday
                                ? "Sunday (Holiday)"
                                : isLocked 
                                  ? "Payroll disbursed (Locked)" 
                                  : rec 
                                    ? `${rec.status}${rec.note ? ` — ${rec.note}` : ""}` 
                                    : weekend ? "Click to mark (Weekend)" : "Click to mark"
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
                              ].join(" ")}
                            >
                              {isLocked && !cfg ? <Lock className="size-3" /> : (cfg?.short ?? "")}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary columns */}
                      <td className="px-2 py-2 text-center font-bold text-green-700 border-l border-default bg-green-50/30">
                        {summary.Present}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-red-600 border-l border-default bg-red-50/30">
                        {summary.Absent}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-amber-700 border-l border-default bg-amber-50/30">
                        {summary.Leave}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700 border-l border-default bg-blue-50/30">
                        {summary.Half_Day}
                      </td>
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
