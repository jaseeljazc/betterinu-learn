"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import type { AttendanceRecord } from "./attendance-view";

const STATUS_CFG = {
  Present: { cls: "bg-green-500",  label: "P" },
  Absent:  { cls: "bg-red-500",    label: "A" },
  Leave:   { cls: "bg-amber-500",  label: "L" },
  Holiday: { cls: "bg-purple-500", label: "H" },
} as const;

type EmployeeRow = {
  id: string; fullName: string; employeeCode: string;
  profilePhotoUrl?: string; deptName?: string;
};

interface Props {
  month: string;
  departmentId: string;
  records: AttendanceRecord[];
  loading: boolean;
  canMark: boolean;
  onDayClick: (empId: string, empName: string, date: string) => void;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <div className="size-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

export function AttendanceCalendarView({ month, departmentId, records, loading, canMark, onDayClick }: Props) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [empLoading, setEmpLoading] = useState(true);

  useEffect(() => {
    setEmpLoading(true);
    const params = new URLSearchParams();
    if (departmentId) params.set("departmentId", departmentId);
    fetch(`/api/admin/employees?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []))
      .finally(() => setEmpLoading(false));
  }, [departmentId]);

  // Build day array for the month
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function isWeekend(day: number) {
    const dow = new Date(y, m - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  function getRecord(empId: string, day: number) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.employeeId === empId && r.date === dateStr);
  }

  function getSummary(empId: string) {
    const empRecs = records.filter((r) => r.employeeId === empId);
    return {
      Present: empRecs.filter((r) => r.status === "Present").length,
      Absent:  empRecs.filter((r) => r.status === "Absent").length,
      Leave:   empRecs.filter((r) => r.status === "Leave").length,
      Holiday: empRecs.filter((r) => r.status === "Holiday").length,
    };
  }

  if (loading || empLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-default bg-white p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
        <Users className="size-10 opacity-25" />
        <p className="text-sm">No employees found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {employees.map((emp) => {
        const summary = getSummary(emp.id);
        return (
          <div key={emp.id} className="rounded-2xl border border-default bg-white p-4 overflow-hidden">
            {/* Employee header */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={emp.fullName} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{emp.fullName}</p>
                <p className="text-[11px] text-muted">{emp.employeeCode}{emp.deptName ? ` · ${emp.deptName}` : ""}</p>
              </div>
            </div>

            {/* Day cells — horizontal scroll */}
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1 min-w-max">
                {days.map((day) => {
                  const weekend = isWeekend(day);
                  const rec = getRecord(emp.id, day);
                  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const cfg = rec ? STATUS_CFG[rec.status as keyof typeof STATUS_CFG] : null;

                  return (
                    <button
                      key={day}
                      disabled={weekend || !canMark}
                      title={rec ? `${rec.status}${rec.note ? ` — ${rec.note}` : ""}` : dateStr}
                      onClick={() => !weekend && canMark && onDayClick(emp.id, emp.fullName, dateStr)}
                      className={[
                        "flex flex-col items-center justify-center rounded-lg w-8 h-10 text-[10px] font-bold transition-all select-none",
                        weekend
                          ? "bg-subtle text-muted cursor-default opacity-50"
                          : cfg
                          ? `${cfg.cls} text-white cursor-pointer hover:opacity-80`
                          : canMark
                          ? "border border-dashed border-default text-muted hover:border-primary hover:text-primary cursor-pointer"
                          : "border border-dashed border-default text-muted cursor-default opacity-40",
                      ].join(" ")}
                    >
                      <span className="text-[9px] opacity-60 leading-none">{day}</span>
                      <span className="leading-none mt-0.5">{cfg?.label ?? (weekend ? "—" : "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary row */}
            <div className="flex gap-4 mt-2 pt-2 border-t border-default/50">
              {(["Present", "Absent", "Leave", "Holiday"] as const).map((s) => (
                <span key={s} className="text-[11px] font-semibold text-secondary">
                  <span className={`inline-block size-2 rounded-full mr-1 ${STATUS_CFG[s].cls}`} />
                  {summary[s]} {s}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
