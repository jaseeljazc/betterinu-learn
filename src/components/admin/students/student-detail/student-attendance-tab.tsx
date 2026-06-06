"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Info,
  Timer,
  StickyNote,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StudentAttendanceModal } from "@/components/admin/students/student-attendance-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayStatus =
  | "present" | "late" | "half_day"
  | "absent" | "leave" | "holiday" | "open" | "future"
  | "pending_leave";

type DayRecord = {
  id?: string;
  date: string;
  status: DayStatus;
  punchIn?: string | null;
  punchOut?: string | null;
  duration?: string | null;
  note?: string | null;
};

type MonthSummary = {
  present: number;
  absent: number;
  leave: number;
  holiday: number;
  late: number;
  halfDay: number;
  pendingLeave: number;
  percentage: number;
};

type CalendarResponse = {
  days: DayRecord[];
  summary: MonthSummary;
  startedAt?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusClasses(status: DayStatus): string {
  switch (status) {
    case "present":       return "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700";
    case "late":          return "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-700";
    case "half_day":      return "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-700";
    case "open":          return "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-700 animate-pulse";
    case "absent":        return "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-700";
    case "leave":         return "bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 text-indigo-700";
    case "pending_leave": return "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-700 border-dashed";
    case "holiday":       return "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-700";
    case "future":        return "bg-white border-slate-100 text-slate-400";
    default:              return "bg-slate-50 border-slate-100 text-slate-400/80 opacity-60";
  }
}

function bulletColor(status: DayStatus): string {
  switch (status) {
    case "present":       return "bg-emerald-500";
    case "late":          return "bg-amber-500";
    case "half_day":      return "bg-blue-500";
    case "open":          return "bg-amber-500";
    case "absent":        return "bg-rose-500";
    case "leave":         return "bg-indigo-500";
    case "pending_leave": return "bg-sky-400";
    case "holiday":       return "bg-purple-500";
    default:              return "";
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  studentName: string;
  canMark: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StudentAttendanceTab({ studentId, studentName, canMark }: Props) {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData]   = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    date?: string;
  }>({ open: false });

  // Fetch calendar data from admin-only route
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    fetch(
      `/api/admin/student-attendance/calendar?studentId=${studentId}&year=${year}&month=${month}`,
      { credentials: "include" }
    )
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error("Empty response from server");
        const d: CalendarResponse & { error?: string } = JSON.parse(text);
        if (!r.ok) throw new Error(d.error ?? `Server error ${r.status}`);
        if (cancelled) return;
        setData(d);
        const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        setSelectedDay(
          d.days.find((day) => day.date === todayStr) ?? d.days[0] ?? null
        );
      })
      .catch((e) => { if (!cancelled) setFetchError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, year, month]);

  function handlePrevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function handleNextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  // Calendar offset — start on Monday
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // After a mark/edit, refresh data
  function handleMarked() {
    setModal({ open: false });
    setLoading(true);
    fetch(
      `/api/admin/student-attendance/calendar?studentId=${studentId}&year=${year}&month=${month}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d: CalendarResponse) => {
        setData(d);
        if (selectedDay) {
          setSelectedDay(
            d.days.find((day) => day.date === selectedDay.date) ?? null
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  return (
    <div className="space-y-4">
      {/* ── Month Navigator ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" />
          Attendance Calendar
        </div>
        <div className="flex items-center gap-1 border border-default rounded-lg bg-white p-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="text-xs font-semibold min-w-[110px] text-center text-foreground px-1">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            disabled={isCurrentMonth}
            onClick={handleNextMonth}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load attendance: {fetchError}
        </div>
      ) : loading ? (
        <Skeleton className="h-[300px] w-full rounded-md" />
      ) : !data ? null : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ── Calendar Grid ─────────────────────────────────────────── */}
          <div className="xl:col-span-2 space-y-3">
            <div className="rounded-md border border-default bg-white p-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted mb-3">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>

              {/* Day tiles */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`off-${i}`} className="aspect-square rounded-md bg-slate-50/30 border border-transparent" />
                ))}

                {data.days.map((day) => {
                  const dayNum    = parseInt(day.date.split("-")[2], 10);
                  const isSelected = selectedDay?.date === day.date;
                  const today = `${year}-${String(month).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                  const isBeforeStart = Boolean(data.startedAt && day.date < data.startedAt && day.date < today);
                  const isStartDay = data.startedAt && day.date === data.startedAt;
                  const cls       = isBeforeStart 
                    ? "bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed"
                    : statusClasses(day.status);

                  const tileBtn = (
                    <button
                      key={day.date}
                      onClick={() => !isBeforeStart && setSelectedDay(day)}
                      disabled={isBeforeStart}
                      className={cn(
                        "aspect-square border rounded-md flex flex-col items-center justify-center text-xs font-semibold transition-all relative overflow-hidden",
                        cls,
                        isSelected && !isBeforeStart && "ring-2 ring-primary ring-offset-1 scale-105 z-10"
                      )}
                    >
                      <span>{dayNum}</span>
                      {/* Start day text inside tile */}
                      {isStartDay && (
                        <span className="text-[7px] font-semibold leading-tight px-0.5 mt-0.5 w-full text-center">
                          Started
                        </span>
                      )}
                      {day.note && day.status !== "future" && !isStartDay && (
                        <span className="text-[9px] font-normal leading-tight px-0.5 mt-0.5 w-full text-center truncate opacity-75">
                          {day.note}
                        </span>
                      )}
                      {day.note && day.status !== "future" && (
                        <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-amber-400" />
                      )}
                      {/* Start day marker — top left */}
                      {isStartDay && (
                        <span className="absolute top-0 left-0 text-[10px]">🎯</span>
                      )}
                      {day.status !== "future" && bulletColor(day.status) && (
                        <span className={cn("absolute bottom-0.5 size-1 rounded-full", bulletColor(day.status))} />
                      )}
                    </button>
                  );

                  return day.note && day.status !== "future" ? (
                    <TooltipProvider key={day.date}>
                      <Tooltip>
                        <TooltipTrigger asChild>{tileBtn}</TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[180px] text-center text-xs">
                          {day.note}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <React.Fragment key={day.date}>{tileBtn}</React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Colour Legend ──────────────────────────────────────── */}
            <div className="rounded-md border border-default bg-white p-3 flex flex-wrap gap-3 text-[10px] text-secondary">
              {[
                ["bg-emerald-50 border-emerald-200", "Present"],
                ["bg-amber-50 border-amber-200",     "Late"],
                ["bg-blue-50 border-blue-200",       "Half Day"],
                ["bg-rose-50 border-rose-200",       "Absent"],
                ["bg-indigo-50 border-indigo-200",   "Leave"],
                ["bg-purple-50 border-purple-200",   "Holiday"],
              ].map(([cls, label]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`size-2.5 rounded border inline-block ${cls}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Day Details */}
            {selectedDay && (
              <div className="rounded-md border border-default bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Day Details</p>
                  {canMark && selectedDay.status !== "future" && (
                    <Button
                      onClick={() => setModal({ open: true, date: selectedDay.date })}
                      className="h-7 px-2.5 text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors rounded-md"
                    >
                      Mark / Edit
                    </Button>
                  )}
                </div>

                <div className="border-t border-default pt-3 space-y-3">
                  {/* Date */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Date</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{fmtDate(selectedDay.date)}</p>
                  </div>

                  {/* Status badge */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mt-1 uppercase border",
                        selectedDay.status === "present"        && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        selectedDay.status === "late"           && "bg-amber-50 text-amber-700 border-amber-200",
                        selectedDay.status === "half_day"       && "bg-blue-50 text-blue-700 border-blue-200",
                        selectedDay.status === "open"           && "bg-amber-50 text-amber-700 border-amber-200",
                        selectedDay.status === "absent"         && "bg-rose-50 text-rose-700 border-rose-200",
                        selectedDay.status === "leave"          && "bg-indigo-50 text-indigo-700 border-indigo-200",
                        selectedDay.status === "holiday"        && "bg-purple-50 text-purple-700 border-purple-200",
                        selectedDay.status === "future"         && "bg-slate-50 text-slate-400 border-slate-200",
                        selectedDay.status === "pending_leave"  && "bg-sky-50 text-sky-700 border-sky-200",
                      )}
                    >
                      {selectedDay.status === "present"        && <CheckCircle2 className="size-3" />}
                      {selectedDay.status === "late"           && <Timer className="size-3" />}
                      {selectedDay.status === "half_day"       && <CheckCircle2 className="size-3" />}
                      {selectedDay.status === "open"           && <Timer className="size-3 animate-spin" />}
                      {selectedDay.status === "absent"         && <XCircle className="size-3" />}
                      {selectedDay.status === "leave"          && <Info className="size-3" />}
                      {selectedDay.status === "holiday"        && <CalendarCheck className="size-3" />}
                      {selectedDay.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Punch times */}
                  {selectedDay.punchIn && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-default rounded-md p-3">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Check In</p>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3 text-emerald-500" />
                          {fmtTime(selectedDay.punchIn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Check Out</p>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3 text-amber-500" />
                          {selectedDay.punchOut ? fmtTime(selectedDay.punchOut) : "Active"}
                        </p>
                      </div>
                      {selectedDay.duration && (
                        <div className="col-span-2 border-t border-slate-200/60 pt-2">
                          <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Duration</p>
                          <p className="text-xs font-semibold text-secondary mt-0.5">{selectedDay.duration}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leave reason */}
                  {(selectedDay as any).leaveReason && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                      <p className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                        <StickyNote className="size-2.5" /> Leave Reason
                      </p>
                      <p className="text-xs text-indigo-900 leading-relaxed">{(selectedDay as any).leaveReason}</p>
                    </div>
                  )}

                  {/* Admin note */}
                  {selectedDay.note && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                        <StickyNote className="size-2.5" /> Admin Note
                      </p>
                      <p className="text-xs text-amber-900 leading-relaxed">{selectedDay.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Stats */}
            <div className="rounded-md border border-default bg-white p-4 space-y-3">
              <p className="text-xs font-bold text-foreground">Monthly Summary</p>
              <div className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 flex items-center justify-center rounded-full border-4 border-slate-100 bg-primary/5">
                  <span className="text-sm font-bold text-primary">{data.summary.percentage}%</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Attendance Score</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Half Day counts as 0.5</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {[
                  { label: "Present",  val: data.summary.present,  cls: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                  { label: "Late",     val: data.summary.late,      cls: "bg-amber-50 border-amber-100 text-amber-700" },
                  { label: "Half Day", val: data.summary.halfDay,   cls: "bg-blue-50 border-blue-100 text-blue-700" },
                  { label: "Absent",   val: data.summary.absent,    cls: "bg-rose-50 border-rose-100 text-rose-700" },
                  { label: "Leave",    val: data.summary.leave,     cls: "bg-indigo-50 border-indigo-100 text-indigo-700" },
                  { label: "Holidays", val: data.summary.holiday,   cls: "bg-purple-50 border-purple-100 text-purple-700 col-span-2" },
                ].map(({ label, val, cls }) => (
                  <div key={label} className={cn("border rounded-md p-2", cls)}>
                    <span className="block font-medium opacity-70">{label}</span>
                    <span className="block text-sm font-bold mt-0.5">{val} {label === "Holidays" ? "Days" : "d"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark / Edit Modal */}
      {modal.open && modal.date && (() => {
        const rec = data?.days.find((d) => d.date === modal.date);
        return (
          <StudentAttendanceModal
            canEdit={canMark}
            onClose={() => setModal({ open: false })}
            studentId={studentId}
            studentName={studentName}
            date={modal.date}
            existingRecord={rec ? {
              id:            rec.id ?? "",
              student_id:    studentId,
              date:          rec.date,
              status:        rec.status,
              note:          rec.note ?? undefined,
              student_name:  "",
              student_email: "",
              punch_in:      rec.punchIn ?? null,
              punch_out:     rec.punchOut ?? null,
            } as any : undefined}
            onSaved={handleMarked}
          />
        );
      })()}
    </div>
  );
}
