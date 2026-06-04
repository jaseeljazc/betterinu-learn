"use client";

import React, { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Info,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Moon,
  Timer,
  Plus,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LeaveApplyModal } from "@/components/student/leave-apply-modal";

type DayRecord = {
  date: string;
  status: "present" | "late" | "early_checkout" | "half_day" | "absent" | "leave" | "holiday" | "open" | "future" | "pending_leave";
  punchIn?: string | null;
  punchOut?: string | null;
  duration?: string | null;
  note?: string | null;
};

type LeaveRequest = {
  id: string;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  created_at: string;
};

type MonthSummary = {
  present: number;
  absent: number;
  leave: number;
  holiday: number;
  late: number;
  earlyCheckout: number;
  halfDay: number;
  percentage: number;
};

type HistoryResponse = {
  days: DayRecord[];
  summary: MonthSummary;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function StudentAttendanceCalendarPage() {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/attendance/history?year=${year}&month=${month}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then((d: HistoryResponse) => {
        setData(d);
        // Automatically select today if in the current month, otherwise first day
        const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const foundToday = d.days.find((day) => day.date === todayStr);
        setSelectedDay(foundToday || d.days[0] || null);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [year, month]);

  // Fetch leave requests for this month
  useEffect(() => {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    fetch(`/api/student/attendance/leave?month=${monthStr}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setLeaveRequests(d.requests ?? []))
      .catch(() => {});
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Get calendar offsets starting on Monday
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="size-6 text-primary" />
              My Attendance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View your monthly punch-in history, holidays, and leave records.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap self-start">
            {/* Apply for Leave button */}
            <Button
              onClick={() => setApplyModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="size-4" /> Apply for Leave
            </Button>

            {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-default p-1 rounded-lg self-start">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted hover:text-foreground"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted hover:text-foreground"
              disabled={year === today.getFullYear() && month === today.getMonth() + 1}
              onClick={handleNextMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-default rounded-xl p-6">
                <Skeleton className="h-[300px] w-full" />
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Calendar Grid */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-default rounded-xl p-6 shadow-sm">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted mb-4">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-2">{w}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {/* Empty offsets */}
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={`offset-${i}`} className="aspect-square bg-slate-50/40 border border-transparent rounded-lg" />
                  ))}

                  {/* Calendar Days */}
                  {data.days.map((day) => {
                    const dayNum = parseInt(day.date.split("-")[2], 10);
                    const isSelected = selectedDay?.date === day.date;

                    // Color schemes based on status
                    let statusClasses = "";
                    if (day.status === "present") {
                      statusClasses = "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700";
                    } else if (day.status === "late") {
                      statusClasses = "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-700";
                    } else if (day.status === "early_checkout") {
                      statusClasses = "bg-orange-50 hover:bg-orange-100/80 border-orange-200 text-orange-700";
                    } else if (day.status === "half_day") {
                      statusClasses = "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-700";
                    } else if (day.status === "open") {
                      statusClasses = "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-700 animate-pulse";
                    } else if (day.status === "absent") {
                      statusClasses = "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-700";
                    } else if (day.status === "leave") {
                      statusClasses = "bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 text-indigo-700";
                    } else if (day.status === "pending_leave") {
                      statusClasses = "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-700 border-dashed";
                    } else if (day.status === "holiday") {
                      statusClasses = "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-700";
                    } else {
                      statusClasses = "bg-slate-50 border-slate-100 text-slate-400/80 opacity-60";
                    }

                    const tileButton = (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "aspect-square border rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all relative overflow-hidden",
                          statusClasses,
                          isSelected && "ring-2 ring-primary ring-offset-2 scale-102 z-10"
                        )}
                      >
                        <span>{dayNum}</span>
                        {/* Inline note text on the tile */}
                        {day.note && day.status !== "future" && (
                          <span
                            className="text-[10px] font-normal leading-tight px-1 mt-0.5 w-full text-center truncate opacity-80"
                          >
                            {day.note}
                          </span>
                        )}
                        {/* Note indicator dot — top right */}
                        {day.note && day.status !== "future" && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-400" />
                        )}
                        {/* Status bullet indicator — bottom center */}
                        {day.status !== "future" && (
                          <span
                            className={cn(
                              "absolute bottom-1 size-1.5 rounded-full",
                              day.status === "present" && "bg-emerald-500",
                              day.status === "late" && "bg-amber-500",
                              day.status === "early_checkout" && "bg-orange-500",
                              day.status === "half_day" && "bg-blue-500",
                              day.status === "open" && "bg-amber-500",
                              day.status === "absent" && "bg-rose-500",
                              day.status === "leave" && "bg-indigo-500",
                              day.status === "pending_leave" && "bg-sky-400",
                              day.status === "holiday" && "bg-purple-500"
                            )}
                          />
                        )}
                      </button>
                    );

                    return day.note && day.status !== "future" ? (
                      <TooltipProvider key={day.date}>
                        <Tooltip>
                          <TooltipTrigger asChild>{tileButton}</TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-center">
                            {day.note}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <React.Fragment key={day.date}>{tileButton}</React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Color legend */}
              <div className="bg-white border border-default rounded-xl p-4 flex flex-wrap gap-4 items-center justify-center text-xs text-secondary shadow-sm">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-emerald-50 border border-emerald-200 inline-block" /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-amber-50 border border-amber-200 inline-block" /> Late
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-orange-50 border border-orange-200 inline-block" /> Early Checkout
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-blue-50 border border-blue-200 inline-block" /> Half Day
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-rose-50 border border-rose-200 inline-block" /> Absent
                </span>
                <span className="flex items-center gap-1.5">
                   <span className="size-3 rounded bg-indigo-50 border border-indigo-200 inline-block" /> Leave
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded border border-dashed border-sky-300 bg-sky-50 inline-block" /> Pending Leave
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-purple-50 border border-purple-200 inline-block" /> Holiday
                </span>
              </div>
            </div>

            {/* Sidebar Details and Stats */}
            <div className="space-y-6">
              {/* Daily Details Card */}
              {selectedDay && (
                <div className="bg-white border border-default rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Day Details</h3>
                  <div className="border-b border-default pb-3">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-semibold text-foreground">{fmtDate(selectedDay.date)}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mt-1 uppercase",
                          selectedDay.status === "present" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          selectedDay.status === "late" && "bg-amber-50 text-amber-700 border border-amber-200",
                          selectedDay.status === "early_checkout" && "bg-orange-50 text-orange-700 border border-orange-200",
                          selectedDay.status === "half_day" && "bg-blue-50 text-blue-700 border border-blue-200",
                          selectedDay.status === "open" && "bg-amber-50 text-amber-700 border border-amber-200",
                          selectedDay.status === "absent" && "bg-rose-50 text-rose-700 border border-rose-200",
                          selectedDay.status === "leave" && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                          selectedDay.status === "holiday" && "bg-purple-50 text-purple-700 border border-purple-200",
                          selectedDay.status === "future" && "bg-slate-50 text-slate-400 border border-slate-200"
                        )}
                      >
                        {selectedDay.status === "present" && <CheckCircle2 className="size-3" />}
                        {selectedDay.status === "late" && <Timer className="size-3" />}
                        {selectedDay.status === "early_checkout" && <Timer className="size-3" />}
                        {selectedDay.status === "half_day" && <CheckCircle2 className="size-3" />}
                        {selectedDay.status === "open" && <Timer className="size-3 animate-spin" />}
                        {selectedDay.status === "absent" && <XCircle className="size-3" />}
                        {selectedDay.status === "leave" && <Info className="size-3" />}
                        {selectedDay.status === "pending_leave" && <Clock className="size-3" />}
                        {selectedDay.status === "holiday" && <CalendarCheck className="size-3" />}
                        {selectedDay.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {selectedDay.punchIn && (
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-default mt-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Punch In</p>
                          <p className="text-sm font-bold text-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3.5 text-emerald-500" />
                            {fmtTime(selectedDay.punchIn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Punch Out</p>
                          <p className="text-sm font-bold text-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3.5 text-amber-500" />
                            {selectedDay.punchOut ? fmtTime(selectedDay.punchOut) : "Active"}
                          </p>
                        </div>
                        {selectedDay.duration && (
                          <div className="col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Duration</p>
                            <p className="text-xs font-semibold text-secondary mt-0.5">{selectedDay.duration}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDay.note && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-2">
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                          <StickyNote className="size-3" /> Admin Note
                        </p>
                        <p className="text-xs text-amber-900 leading-relaxed">{selectedDay.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Stats Summary Card */}
              <div className="bg-white border border-default rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground">Monthly Statistics</h3>
                <div className="flex items-center gap-4">
                  <div className="relative size-16 shrink-0 flex items-center justify-center rounded-full border-4 border-slate-100 bg-primary/5">
                    <span className="text-base font-bold text-primary">{data.summary.percentage}%</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Attendance Score</h4>
                    <p className="text-xs text-muted-foreground">Calculated with weightage (Half Day = 0.5).</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Present</span>
                    <span className="text-base font-bold text-emerald-700 mt-0.5 block">{data.summary.present} Days</span>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Late</span>
                    <span className="text-base font-bold text-amber-700 mt-0.5 block">{data.summary.late} Days</span>
                  </div>
                  <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Early Checkout</span>
                    <span className="text-base font-bold text-orange-700 mt-0.5 block">{data.summary.earlyCheckout} Days</span>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Half Day</span>
                    <span className="text-base font-bold text-blue-700 mt-0.5 block">{data.summary.halfDay} Days</span>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Absent</span>
                    <span className="text-base font-bold text-rose-700 mt-0.5 block">{data.summary.absent} Days</span>
                  </div>
                  <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg">
                    <span className="text-muted block font-medium">Leave</span>
                    <span className="text-base font-bold text-indigo-700 mt-0.5 block">{data.summary.leave} Days</span>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100 p-2.5 rounded-lg col-span-2">
                    <span className="text-muted block font-medium">Holidays</span>
                    <span className="text-base font-bold text-purple-700 mt-0.5 block">{data.summary.holiday} Days</span>
                  </div>
                </div>
              </div>

              {/* My Leave Requests */}
              {leaveRequests.length > 0 && (
                <div className="bg-white border border-default rounded-xl p-6 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-foreground">My Leave Requests</h3>
                  <div className="space-y-2">
                    {leaveRequests.map((lr) => (
                      <div
                        key={lr.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-default p-3 bg-subtle/40"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            {new Date(lr.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-secondary mt-0.5 truncate">{lr.reason}</p>
                          {lr.admin_note && (
                            <p className="text-xs text-muted mt-0.5 italic">"{lr.admin_note}"</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                            lr.status === "pending"  && "bg-sky-50 text-sky-700 border-sky-200",
                            lr.status === "approved" && "bg-green-50 text-green-700 border-green-200",
                            lr.status === "rejected" && "bg-red-50 text-red-600 border-red-200"
                          )}
                        >
                          {lr.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Apply for Leave Modal */}
      {applyModalOpen && (
        <LeaveApplyModal
          onClose={() => setApplyModalOpen(false)}
          onApplied={() => {
            setApplyModalOpen(false);
            // Refresh leave requests
            const monthStr = `${year}-${String(month).padStart(2, "0")}`;
            fetch(`/api/student/attendance/leave?month=${monthStr}`, { credentials: "include" })
              .then((r) => r.json())
              .then((d) => setLeaveRequests(d.requests ?? []))
              .catch(() => {});
          }}
        />
      )}
    </PageWrapper>
  );
}
