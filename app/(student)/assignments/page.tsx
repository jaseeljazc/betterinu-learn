"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle2, XCircle, AlertCircle,
  Globe, BookOpen, ChevronRight, CalendarClock,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Skeleton } from "@/components/ui/skeleton";

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

const STATUS_CFG = {
  todo:     { Icon: AlertCircle,  label: "To Do",        cls: "bg-blue-50 border-blue-100 text-blue-600",   dot: "bg-blue-400" },
  pending:  { Icon: Clock,        label: "Under Review",  cls: "bg-amber-50 border-amber-200 text-amber-600", dot: "bg-amber-400" },
  approved: { Icon: CheckCircle2, label: "Approved",      cls: "bg-green-50 border-green-100 text-green-700", dot: "bg-green-500" },
  rejected: { Icon: XCircle,      label: "Needs Revision",cls: "bg-red-50 border-red-100 text-red-600",       dot: "bg-red-400" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyAssignmentsPage() {
  const [assignments, setAssignments] = useState<StandaloneAssignment[] | null>(null);

  useEffect(() => {
    fetch("/api/student/standalone-assignments", { credentials: "include" })
      .then(r => r.json())
      .then(d => setAssignments(d.assignments ?? []))
      .catch(() => setAssignments([]));
  }, []);

  const isLoading = assignments === null;

  function getStatus(a: StandaloneAssignment): "todo" | "pending" | "approved" | "rejected" {
    if (!a.submission_status) return "todo";
    return a.submission_status;
  }

  const groups = {
    revision: (assignments ?? []).filter(a => getStatus(a) === "rejected"),
    pending:  (assignments ?? []).filter(a => getStatus(a) === "pending"),
    todo:     (assignments ?? []).filter(a => getStatus(a) === "todo"),
    approved: (assignments ?? []).filter(a => getStatus(a) === "approved"),
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-4xl pt-8 px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">My Tasks</h1>
          </div>
          <p className="text-sm text-secondary">Assignments specifically given to you by your instructors.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        ) : assignments!.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-default bg-white">
            <ClipboardList className="size-12 text-muted mb-3" />
            <p className="text-sm font-semibold text-foreground">No tasks assigned yet</p>
            <p className="text-xs text-muted mt-1">Your instructor will assign tasks here when ready.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Needs Revision */}
            {groups.revision.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Needs Revision · {groups.revision.length}</p>
                <div className="flex flex-col gap-3">
                  {groups.revision.map(a => <AssignmentCard key={a.assignment_id} assignment={a} status="rejected" />)}
                </div>
              </section>
            )}
            {/* To Do */}
            {groups.todo.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">To Do · {groups.todo.length}</p>
                <div className="flex flex-col gap-3">
                  {groups.todo.map(a => <AssignmentCard key={a.assignment_id} assignment={a} status="todo" />)}
                </div>
              </section>
            )}
            {/* Under Review */}
            {groups.pending.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Under Review · {groups.pending.length}</p>
                <div className="flex flex-col gap-3">
                  {groups.pending.map(a => <AssignmentCard key={a.assignment_id} assignment={a} status="pending" />)}
                </div>
              </section>
            )}
            {/* Approved */}
            {groups.approved.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Completed · {groups.approved.length}</p>
                <div className="flex flex-col gap-3">
                  {groups.approved.map(a => <AssignmentCard key={a.assignment_id} assignment={a} status="approved" />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function AssignmentCard({ assignment: a, status }: { assignment: StandaloneAssignment; status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] || STATUS_CFG.todo;
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
          {a.due_date && (
            <span className="flex items-center gap-1"><CalendarClock className="size-3" /> Due {fmtDate(a.due_date)}</span>
          )}
          {a.submitted_at && (
            <span className="flex items-center gap-1"><Clock className="size-3" /> Submitted {fmtDate(a.submitted_at)}</span>
          )}
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
