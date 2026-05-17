"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle,
  Globe, BookOpen, ChevronRight, CalendarClock, GraduationCap,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ────────────────────────────────────────────────────────────────────
interface StandaloneAssignment {
  assignment_id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  scope: "course" | "common";
  course_title: string | null;
  submission_id: string | null;
  submission_status: "pending" | "approved" | "rejected" | null;
  submitted_at: string | null;
  feedback: string | null;
}

interface CourseAssignment {
  submission_id: string;
  assignment_id: string;
  course_id: string;
  week_id: string;
  day_id: string;
  title: string;
  due_date: string | null;
  scope: "course";
  course_title: string;
  submission_status: "pending" | "approved" | "rejected";
  submitted_at: string;
  feedback: string | null;
}

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  todo:     { Icon: AlertCircle,  label: "To Do",         cls: "bg-blue-50 border-blue-100 text-blue-600",   dot: "bg-blue-400" },
  pending:  { Icon: Clock,        label: "Under Review",   cls: "bg-amber-50 border-amber-200 text-amber-600", dot: "bg-amber-400" },
  approved: { Icon: CheckCircle2, label: "Approved",       cls: "bg-green-50 border-green-100 text-green-700", dot: "bg-green-500" },
  rejected: { Icon: XCircle,      label: "Needs Revision", cls: "bg-red-50 border-red-100 text-red-600",       dot: "bg-red-400" },
};

type CourseFilter = "all" | "pending" | "approved" | "rejected";
type OtherFilter  = "all" | "todo" | "pending" | "approved" | "rejected";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyAssignmentsPage() {
  const [standaloneAssignments, setStandaloneAssignments] = useState<StandaloneAssignment[] | null>(null);
  const [courseAssignments, setCourseAssignments]         = useState<CourseAssignment[] | null>(null);
  const [activeTab, setActiveTab]     = useState<"course" | "other">("course");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [otherFilter, setOtherFilter]   = useState<OtherFilter>("all");

  useEffect(() => {
    fetch("/api/student/standalone-assignments", { credentials: "include" })
      .then(r => r.json())
      .then(d => setStandaloneAssignments(d.assignments ?? []))
      .catch(() => setStandaloneAssignments([]));

    fetch("/api/student/course-assignments", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCourseAssignments(d.assignments ?? []))
      .catch(() => setCourseAssignments([]));
  }, []);

  const isLoading   = standaloneAssignments === null || courseAssignments === null;
  const newOtherCount = standaloneAssignments?.filter(a => !a.submission_id).length ?? 0;

  // Filtered lists
  const filteredCourse = (courseAssignments ?? []).filter(a =>
    courseFilter === "all" || a.submission_status === courseFilter
  );
  const filteredOther = (standaloneAssignments ?? []).filter(a => {
    const status = a.submission_status ?? "todo";
    return otherFilter === "all" || status === otherFilter;
  });

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl pt-8 px-4 pb-16">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">My Tasks</h1>
          </div>
          <p className="text-sm text-secondary">All assignments given to you by your instructors.</p>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex border-b border-default mb-6">
          <button
            onClick={() => setActiveTab("course")}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "course" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <GraduationCap className="size-4" />
            Course Tasks
            {!isLoading && (courseAssignments?.length ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "course" ? "bg-primary/10 text-primary" : "bg-subtle text-muted"}`}>
                {courseAssignments!.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "other" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Globe className="size-4" />
            Other Tasks
            {!isLoading && (standaloneAssignments?.length ?? 0) > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "other" ? "bg-primary/10 text-primary" : "bg-subtle text-muted"}`}>
                {standaloneAssignments!.length}
              </span>
            )}
            {newOtherCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                {newOtherCount} new
              </span>
            )}
          </button>
        </div>

        {/* ── Tab Content ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : activeTab === "course" ? (
          /* ─── Course Tasks Tab ─── */
          <>
            {/* Filter pills */}
            {courseAssignments!.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {(["all", "pending", "approved", "rejected"] as CourseFilter[]).map(f => {
                  const count = f === "all"
                    ? courseAssignments!.length
                    : courseAssignments!.filter(a => a.submission_status === f).length;
                  const labels: Record<CourseFilter, string> = { all: "All", pending: "Under Review", approved: "Approved", rejected: "Needs Revision" };
                  return (
                    <button key={f} onClick={() => setCourseFilter(f)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors border ${
                        courseFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-secondary border-default hover:border-primary hover:text-primary"
                      }`}>
                      {labels[f]} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            {filteredCourse.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-default bg-white">
                <GraduationCap className="size-12 text-muted mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  {courseFilter === "all" ? "No course tasks yet" : `No ${courseFilter} tasks`}
                </p>
                <p className="text-xs text-muted mt-1">Assignments from your enrolled courses will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCourse.map(a => <CourseAssignmentCard key={a.submission_id} assignment={a} />)}
              </div>
            )}
          </>
        ) : (
          /* ─── Other Tasks Tab ─── */
          <>
            {/* Filter pills */}
            {standaloneAssignments!.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {(["all", "todo", "pending", "approved", "rejected"] as OtherFilter[]).map(f => {
                  const count = f === "all"
                    ? standaloneAssignments!.length
                    : standaloneAssignments!.filter(a => (a.submission_status ?? "todo") === f).length;
                  const labels: Record<OtherFilter, string> = { all: "All", todo: "To Do", pending: "Under Review", approved: "Approved", rejected: "Needs Revision" };
                  return (
                    <button key={f} onClick={() => setOtherFilter(f)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors border ${
                        otherFilter === f
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-secondary border-default hover:border-primary hover:text-primary"
                      }`}>
                      {labels[f]} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            {filteredOther.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-default bg-white">
                <Globe className="size-12 text-muted mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  {otherFilter === "all" ? "No other tasks yet" : `No ${otherFilter} tasks`}
                </p>
                <p className="text-xs text-muted mt-1">Standalone tasks assigned to you will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredOther.map(a => (
                  <StandaloneCard key={a.assignment_id} assignment={a} status={a.submission_status ?? "todo"} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}

// ── Course Assignment Card ────────────────────────────────────────────────────
function CourseAssignmentCard({ assignment: a }: { assignment: CourseAssignment }) {
  const status = a.submission_status ?? "pending";
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-default bg-white p-4 shadow-sm">
      <span className={`size-2.5 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-bold text-foreground text-sm">{a.title}</p>
          <span className="inline-flex items-center gap-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700 px-2 py-0.5 text-[9px] font-bold uppercase">
            <BookOpen className="size-2.5" />{a.course_title}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          {a.due_date && <span className="flex items-center gap-1"><CalendarClock className="size-3" /> Due {fmtDate(a.due_date)}</span>}
          {a.submitted_at && <span className="flex items-center gap-1"><Clock className="size-3" /> Submitted {fmtDate(a.submitted_at)}</span>}
        </div>
        {status === "rejected" && a.feedback && (
          <p className="mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 truncate">Feedback: {a.feedback}</p>
        )}
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
        <cfg.Icon size={11} />{cfg.label}
      </span>
    </div>
  );
}

// ── Standalone Assignment Card ────────────────────────────────────────────────
function StandaloneCard({ assignment: a, status }: { assignment: StandaloneAssignment; status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.todo;
  return (
    <Link
      href={`/assignments/${a.assignment_id}`}
      className="group flex items-center gap-4 rounded-2xl border border-default bg-white p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <span className={`size-2.5 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-bold text-foreground text-sm">{a.title}</p>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
            a.scope === "common" ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-blue-50 border-blue-200 text-blue-700"
          }`}>
            {a.scope === "common" ? <><Globe className="size-2.5" />Common</> : <><BookOpen className="size-2.5" />{a.course_title}</>}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          {a.due_date && <span className="flex items-center gap-1"><CalendarClock className="size-3" /> Due {fmtDate(a.due_date)}</span>}
          {a.submitted_at && <span className="flex items-center gap-1"><Clock className="size-3" /> Submitted {fmtDate(a.submitted_at)}</span>}
        </div>
        {status === "rejected" && a.feedback && (
          <p className="mt-1 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 truncate">Feedback: {a.feedback}</p>
        )}
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
        <cfg.Icon size={11} />{cfg.label}
      </span>
      <ChevronRight size={14} className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
