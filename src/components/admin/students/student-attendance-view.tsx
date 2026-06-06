"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, UserX, Clock, Gift, Eraser, X } from "lucide-react";
import { StudentAttendanceModal } from "./student-attendance-modal";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Types                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

type Student = {
  id: string;
  name: string;
  email: string;
};

export type StudentAttendanceRecord = {
  id: string;
  student_id: string;
  date: string;
  status: string;
  note?: string;
  marked_by?: string | null;
  student_name: string;
  student_email: string;
  punch_in?: string | null;
  punch_out?: string | null;
};

interface Props {
  canMark: boolean;
  canEdit: boolean;
}

const ALL = "__all__";

const DAY_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function toDateKey(date: Date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StudentAttendanceView({ canMark, canEdit }: Props) {
  const today      = new Date();
  const todayDate  = toDateKey(today);

  const [students, setStudents]       = useState<Student[]>([]);
  const [month, setMonth]             = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const [records, setRecords]         = useState<StudentAttendanceRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading]         = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [weekendSet, setWeekendSet]   = useState<Set<number>>(new Set([0])); // default: Sunday only
  const [modal, setModal]             = useState<{
    open: boolean;
    studentId?: string;
    studentName?: string;
    date?: string;
  }>({ open: false });
  const [bulkHolidayModal, setBulkHolidayModal] = useState<{
    open: boolean;
    day?: number;
  }>({ open: false });
  const [tempHolidayType, setTempHolidayType] = useState<"required" | "optional">("required");

  // Fetch weekend_days from settings
  useEffect(() => {
    fetch("/api/admin/student-attendance/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const days: string[] = d.value?.weekend_days ?? ["sunday"];
        setWeekendSet(new Set(days.map((wd) => DAY_NUM[wd.toLowerCase()] ?? -1)));
      })
      .catch(() => {}); // fallback: keep Sunday-only default
  }, []);

  // Fetch student list
  useEffect(() => {
    fetch("/api/admin/students", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []));
  }, []);

  // Fetch monthly records
  const fetchRecords = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/student-attendance?month=${month}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Fetch today's records for summary stats
  const fetchTodayRecords = useCallback(() => {
    setTodayLoading(true);
    fetch(`/api/admin/student-attendance?date=${todayDate}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTodayRecords(d.records ?? []))
      .finally(() => setTodayLoading(false));
  }, [todayDate]);

  useEffect(() => { fetchTodayRecords(); }, [fetchTodayRecords]);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function isConfiguredWeekend(day: number) {
    return weekendSet.has(new Date(y, m - 1, day).getDay());
  }
  // Keep isWeekend as visual hint (Sat/Sun styling) separate from configured-off logic
  function isWeekend(day: number) {
    const dow = new Date(y, m - 1, day).getDay();
    return dow === 0 || dow === 6;
  }
  function getDayLabel(day: number) {
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(y, m - 1, day).getDay()];
  }

  function getRecord(studentId: string, day: number) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return records.find((r) => r.student_id === studentId && r.date === dateStr);
  }

  async function handleBulkMark(day: number, status: string, holidayType?: "required" | "optional") {
    if (isConfiguredWeekend(day)) {
      toast.error("Cannot bulk-mark a weekly off day — it is an automatic holiday");
      return;
    }
    if (status === "Holiday" && !holidayType) {
      setBulkHolidayModal({ open: true, day });
      return;
    }
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return;

    try {
      const res = await fetch("/api/admin/student-attendance/bulk-mark", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          date: dateStr,
          status,
          ...(status === "Holiday" ? { holiday_type: holidayType } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk mark");

      if (data.failed > 0) {
        toast.error(`${data.failed} students failed to mark`);
      } else {
        toast.success(`Marked ${studentIds.length} students as ${status === "CLEAR" ? "Clear" : status} ${status === "Holiday" ? `(${holidayType}) ` : ""}for day ${day}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    }

    fetchRecords();
    fetchTodayRecords();
  }

  // Today stats
  const present = todayRecords.filter((r) => r.status === "Present").length;
  const late = todayRecords.filter((r) => r.status === "Late").length;
  const halfDay = todayRecords.filter((r) => r.status === "Half_Day").length;
  const absent  = todayRecords.filter((r) => r.status === "Absent").length;
  const leave   = todayRecords.filter((r) => r.status === "Leave").length;
  const holiday = todayRecords.filter((r) => r.status === "Holiday").length;

  const STATUS_CFG: Record<string, { short: string; cls: string; ring: string }> = {
    Present:  { short: "P",  cls: "bg-green-500 text-white",  ring: "ring-green-300" },
    Late:     { short: "LT", cls: "bg-amber-500 text-white",  ring: "ring-amber-300" },
    Half_Day: { short: "HD", cls: "bg-blue-500 text-white",   ring: "ring-blue-300" },
    Absent:   { short: "A",  cls: "bg-red-500 text-white",    ring: "ring-red-300" },
    Leave:    { short: "L",  cls: "bg-amber-500 text-white",  ring: "ring-amber-300" },
    Holiday:  { short: "H",  cls: "bg-purple-500 text-white", ring: "ring-purple-300" },
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
            className="h-9 rounded-md border border-default bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">Today: {todayDate}</p>
        {todayLoading && <p className="text-xs font-medium text-muted">Updating...</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Present", count: present + late, Icon: Users, color: "bg-green-50 text-green-700 border-green-200" },
          { label: "Absent",  count: absent,  Icon: UserX, color: "bg-red-50 text-red-600 border-red-200" },
          { label: "Leave",   count: leave,   Icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Half Day", count: halfDay, Icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "Holiday", count: holiday, Icon: Gift,  color: "bg-purple-50 text-purple-700 border-purple-200" },
        ].map(({ label, count, Icon, color }) => (
          <div key={label} className={`flex items-center gap-3 rounded-md border p-4 ${color}`}>
            <Icon className="size-5 shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-bold leading-none">{count}</p>
              <p className="text-xs font-semibold mt-0.5 opacity-70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(STATUS_CFG) as [string, { short: string; cls: string }][]).map(([label, cfg]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-secondary">
            <span className={`inline-flex items-center justify-center size-6 rounded text-[10px] font-bold ${cfg.cls}`}>
              {cfg.short}
            </span>
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-6 rounded text-[10px] font-bold bg-subtle text-muted">—</span>
          Weekly Off
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-secondary">
          <span className="inline-flex items-center justify-center size-6 rounded border border-dashed border-default text-[10px] text-muted" />
          Not marked
        </span>
        {canMark && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            · Click a day number to bulk mark all students
          </span>
        )}
      </div>

      {/* Attendance grid */}
      <div className="rounded-md border border-default bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted text-sm animate-pulse">
            Loading attendance data…
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
            <Users className="size-10 opacity-25" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-default/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-default/50">
            <table className="border-collapse text-xs w-full">
              <thead>
                <tr className="bg-subtle/60 border-b border-default sticky top-0 z-10">
                  <th className="sticky left-0 z-20 bg-subtle/90 backdrop-blur text-left px-4 py-2.5 text-xs font-bold text-foreground border-r border-default min-w-[200px] w-[200px]">
                    Student
                  </th>
                  {days.map((day) => {
                    const offDay  = isConfiguredWeekend(day);
                    const isToday = y === today.getFullYear() && m === today.getMonth() + 1 && day === today.getDate();

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
                        {canMark && !offDay ? (
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
                              <DropdownMenuItem
                                onClick={() => handleBulkMark(day, "CLEAR")}
                                className="gap-2 text-xs cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-500/10"
                              >
                                <Eraser className="size-3.5" />
                                Clear Marks (Normal)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {Object.entries(STATUS_CFG).map(([status, cfg]) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleBulkMark(day, status)}
                                  className="gap-2 text-xs cursor-pointer"
                                >
                                  <span className={`inline-flex items-center justify-center size-5 rounded text-[10px] font-bold ${cfg.cls}`}>
                                    {cfg.short}
                                  </span>
                                  {status}
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
                    );
                  })}
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">P</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">A</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">L</th>
                  <th className="px-3 py-2.5 text-center font-bold text-foreground border-l border-default min-w-[52px] w-[52px]">HD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {students.map((student, idx) => {
                  const stuRecs  = records.filter((r) => r.student_id === student.id);
                  let pCount = 0, aCount = 0, lCount = 0, hdCount = 0;

                  for (let dayVal = 1; dayVal <= daysInMonth; dayVal++) {
                    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`;
                    if (isConfiguredWeekend(dayVal)) continue; // weekly off days, skip from counts

                    const rec    = stuRecs.find((r) => r.date === dateStr);
                    const status = rec?.status;
                    if (status === "Present" || status === "Late") pCount++;
                    else if (status === "Absent")  aCount++;
                    else if (status === "Leave")   lCount++;
                    else if (status === "Half_Day") hdCount++;
                  }

                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "bg-white" : "bg-elevated"}>
                      <td className={`sticky left-0 z-10 border-r border-default px-4 py-2 ${idx % 2 === 0 ? "bg-white" : "bg-elevated"}`}>
                        <Link href={`/admin/students/${student.id}`} className="block hover:underline hover:text-primary transition-colors">
                          <p className="font-semibold text-foreground truncate max-w-[160px]">{student.name}</p>
                          <p className="text-[10px] text-muted truncate max-w-[160px]">{student.email}</p>
                        </Link>
                      </td>

                      {days.map((day) => {
                        const offDay  = isConfiguredWeekend(day);
                        const weekend = isWeekend(day);
                        const rec     = getRecord(student.id, day);
                        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isToday = y === today.getFullYear() && m === today.getMonth() + 1 && day === today.getDate();

                        const cfg = offDay
                          ? STATUS_CFG["Holiday"]
                          : rec
                            ? STATUS_CFG[rec.status as keyof typeof STATUS_CFG]
                            : null;

                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-1 text-center border-r border-default/50 last:border-r-0 ${isToday ? "bg-primary/[0.04]" : ""}`}
                            title={
                              (isToday ? "Today · " : "") +
                              (offDay
                                ? "Weekly Off (Holiday)"
                                : rec
                                  ? `${rec.status}${rec.note ? ` — ${rec.note}` : ""}`
                                  : weekend ? "Click to mark (Weekend)" : "Click to mark")
                            }
                          >
                            <button
                              disabled={!canMark || offDay}
                              onClick={() =>
                                canMark && !offDay &&
                                setModal({
                                  open: true,
                                  studentId: student.id,
                                  studentName: student.name,
                                  date: dateStr,
                                })
                              }
                              className={[
                                "mx-auto size-[26px] rounded flex items-center justify-center text-[10px] font-bold transition-all",
                                offDay
                                  ? (cfg ? `${cfg.cls} opacity-80 cursor-not-allowed` : "")
                                  : cfg
                                    ? `${cfg.cls} hover:opacity-75 cursor-pointer`
                                    : canMark
                                      ? `border border-dashed ${weekend ? "border-purple-200 hover:border-primary bg-purple-50/30" : "border-default"} hover:border-primary hover:bg-primary/5 cursor-pointer`
                                      : "border border-dashed border-default/40 cursor-default",
                                isToday ? "ring-2 ring-primary ring-offset-1" : "",
                              ].join(" ")}
                            >
                              {cfg?.short ?? ""}
                            </button>
                          </td>
                        );
                      })}

                      <td className="px-2 py-2 text-center font-bold text-green-700 border-l border-default bg-green-50/30">{pCount}</td>
                      <td className="px-2 py-2 text-center font-bold text-red-600 border-l border-default bg-red-50/30">{aCount}</td>
                      <td className="px-2 py-2 text-center font-bold text-amber-700 border-l border-default bg-amber-50/30">{lCount}</td>
                      <td className="px-2 py-2 text-center font-bold text-blue-700 border-l border-default bg-blue-50/30">{hdCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && (
        <StudentAttendanceModal
          studentId={modal.studentId}
          studentName={modal.studentName}
          date={modal.date}
          existingRecord={records.find(
            (r) => r.student_id === modal.studentId && r.date === modal.date
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

      {bulkHolidayModal.open && bulkHolidayModal.day && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <h2 className="text-base font-bold text-foreground">Bulk Mark Holiday</h2>
              <button
                onClick={() => setBulkHolidayModal({ open: false })}
                className="rounded-md p-1.5 text-muted hover:text-primary hover:bg-subtle transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-secondary">
                You are marking day <strong>{bulkHolidayModal.day}</strong> of the month as a Holiday for all students.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Holiday Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempHolidayType("required")}
                    className={[
                      "rounded-md border-2 px-4 py-3 text-xs font-bold transition-all text-left",
                      tempHolidayType === "required"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-red-200 text-red-700 hover:bg-red-50 bg-white",
                    ].join(" ")}
                  >
                    🔴 Required
                    <span className="block text-[10px] font-normal mt-0.5 opacity-80">Institution closed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempHolidayType("optional")}
                    className={[
                      "rounded-md border-2 px-4 py-3 text-xs font-bold transition-all text-left",
                      tempHolidayType === "optional"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-200 text-amber-700 hover:bg-amber-50 bg-white",
                    ].join(" ")}
                  >
                    🟡 Optional
                    <span className="block text-[10px] font-normal mt-0.5 opacity-80">Student may attend</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-default">
              <button
                onClick={() => {
                  const day = bulkHolidayModal.day!;
                  setBulkHolidayModal({ open: false });
                  handleBulkMark(day, "Holiday", tempHolidayType);
                }}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-xs transition-all"
              >
                Confirm Bulk Holiday
              </button>
              <button
                onClick={() => setBulkHolidayModal({ open: false })}
                className="flex-1 rounded-md border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
