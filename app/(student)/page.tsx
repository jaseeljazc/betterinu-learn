"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import {
  AlertCircle, BookOpenCheck, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock, GraduationCap, LayoutDashboard,
  LogOut, User2, XCircle,
} from "lucide-react";
import { clientAuth } from "@/lib/firebase-client";
import { useProgress } from "@/lib/hooks/useProgress";
import RoboLoader from "@/components/loading/robo-loader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Course } from "@/types";
import type { User } from "firebase/auth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Submission {
  id: string;
  assignment_id: string;
  course_id: string;
  week_id: string;
  day_id: string;
  course_title: string;
  submitted_text: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
}

interface FlatAssignment {
  id: string;
  assignment_id: string;
  course_id: string;
  week_id: string;
  day_id: string;
  course_title: string;
  assignment_title: string;
  submitted_at?: string;
  status: "todo" | "pending" | "approved" | "rejected";
  feedback?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  todo: {
    Icon: AlertCircle,
    label: "To Do",
    cls: "bg-info-50 border-info-100 text-info-600",
  },
  pending: {
    Icon: Clock,
    label: "Under Review",
    cls: "bg-amber-50 border-amber-200 text-amber-600",
  },
  approved: {
    Icon: CheckCircle2,
    label: "Approved",
    cls: "bg-success-50 border-success-100 text-success-600",
  },
  rejected: {
    Icon: XCircle,
    label: "Revise",
    cls: "bg-danger-50 border-danger-100 text-danger-600",
  },
};

const SORT_ORDER = { todo: 0, rejected: 1, pending: 2, approved: 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string | null) {
  if (!name) return "S";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function fmtDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function buildAssignments(courses: Course[], submissions: Submission[]): FlatAssignment[] {
  const flat: FlatAssignment[] = [];
  courses.forEach((course) => {
    course.weeks?.forEach((week) => {
      week.days?.forEach((day) => {
        day.subModules?.forEach((mod) => {
          if (mod.type !== "assignment") return;
          const sub = submissions.find((s) => s.assignment_id === mod.id);
          flat.push({
            id: sub?.id ?? `unsub-${mod.id}`,
            assignment_id: mod.id,
            course_id: course.id,
            week_id: week.id,
            day_id: day.id,
            course_title: course.title,
            assignment_title: mod.title || "Assignment",
            submitted_at: sub?.submitted_at,
            status: sub ? sub.status : "todo",
            feedback: sub?.feedback,
          });
        });
      });
    });
  });
  return flat.sort((a, b) => SORT_ORDER[a.status] - SORT_ORDER[b.status]);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({ user }: { user: User | null }) {
  async function handleSignOut() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  return (
    <div className="rounded-xl border border-default bg-white p-5 shadow-sm">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-green-700">
          <User2 size={11} />
          Student Profile
        </span>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[11px] text-text-muted hover:bg-red-100 hover:text-red-600 focus-ring"
        >
          <LogOut size={12} />
          Sign out
        </Button>
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          <Avatar className="size-14 border-2 border-green-100">
            <AvatarFallback className="bg-green-50 font-mono text-base font-extrabold text-green-700">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-primary">
              {user.displayName || "Student"}
            </p>
            <p className="truncate font-mono text-[11px] text-text-muted">
              {user.email}
            </p>
            <p className="mt-1 text-[10px] text-text-disabled">
              Member since {fmtDate(user.metadata.creationTime)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon, value, label,
}: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-default bg-white px-3.5 py-3 shadow-sm">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-green-50 text-green-700">
        <Icon size={14} />
      </span>
      <span className="font-mono text-sm font-extrabold text-text-primary">
        {value}
      </span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function AssignmentRow({ item }: { item: FlatAssignment }) {
  const cfg = STATUS_CONFIG[item.status];
  const href = `/course/${item.course_id}/learn/${item.week_id}/${item.assignment_id}`;

  return (
    <Link
      href={href}
      className="transition-all duration-200 focus-ring flex flex-col gap-1.5 rounded-lg border border-border-muted bg-white p-3.5 hover:border-green-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-text-primary">
            {item.assignment_title}
          </p>
          <p className="flex items-center gap-1 font-mono text-[10px] text-text-muted">
            {item.course_title}
            {item.submitted_at && (
              <><span className="opacity-40">·</span><Clock size={9} />Due {fmtDate(item.submitted_at)}</>
            )}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${cfg.cls}`}>
          <cfg.Icon size={10} />
          {cfg.label}
        </span>
      </div>
      {item.feedback && (
        <p className="rounded-md border border-border-muted bg-bg-elevated px-2.5 py-1.5 text-[11px] text-text-secondary">
          <span className="font-semibold text-text-muted">Feedback: </span>
          {item.feedback}
        </p>
      )}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { progress } = useProgress();
  const [user, setUser]               = useState<User | null>(null);
  const [courses, setCourses]         = useState<Course[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    const unsub = clientAuth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    fetch("/api/student/courses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setCourses([]));

    fetch("/api/student/assignments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSubmissions(d.submissions ?? []))
      .catch(() => setSubmissions([]));
  }, []);

  const isLoading  = courses === null || submissions === null;
  const assignments = isLoading ? [] : buildAssignments(courses, submissions);
  const pending    = assignments.filter((a) => a.status === "todo" || a.status === "rejected");
  const reviewed   = assignments.filter((a) => a.status === "pending" || a.status === "approved");

  return (
    <PageWrapper>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 px-4 py-8 lg:grid-cols-[1fr_280px]">

        {/* ── Main ────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-col gap-5">

          {/* Greeting header */}
          <header className="hero-surface rounded-2xl px-7 py-6 relative bg-primary">
            {/* Top accent bar */}

            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black ">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-white">
              {user?.displayName
                ? `Good to see you, ${user.displayName}.`
                : "Welcome back."}
            </h1>
            <p className="mt-1 text-sm text-white">
              Here's what's on your plate today.
            </p>
          </header>

          {/* ── Courses ── */}
          <section className="rounded-2xl border border-default bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-base font-bold tracking-tight text-text-primary">
              My Courses
            </h2>

            {courses === null ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-border-muted p-4">
                    <Skeleton className="mb-3 h-4 w-2/3" />
                    <Skeleton className="mb-1.5 h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-text-muted">
                <BookOpenCheck size={28} className="text-text-disabled" />
                No courses assigned yet. Contact your admin.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {courses.map((course) => {
                  const courseAssignments = assignments.filter((a) => a.course_id === course.id);
                  const approvedCount = courseAssignments.filter((a) => a.status === "approved").length;
                  const pct = courseAssignments.length
                    ? Math.round((approvedCount / courseAssignments.length) * 100)
                    : 0;

                  return (
                    <Link
                      key={course.id}
                      href={`/course/${course.id}`}
                      className="transition-all duration-200 focus-ring group flex flex-col gap-2 rounded-xl border border-default bg-white p-4 hover:border-green-300 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-sm border border-green-200 bg-green-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-green-700">
                          Course
                        </span>
                        <ChevronRight
                          size={13}
                          className="text-text-disabled transition-colors duration-150 group-hover:text-green-700"
                        />
                      </div>
                      <h3 className="text-sm font-bold leading-snug text-text-primary">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">
                          {course.description}
                        </p>
                      )}
                      {courseAssignments.length > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                            <div
                              className="progress-fill h-full rounded-full"
                              style={{ "--progress-value": `${pct}%` } as React.CSSProperties}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-green-700">
                            {approvedCount}/{courseAssignments.length}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
                
          {/* ── Assignments ── */}
          <section className="rounded-2xl border border-default bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold tracking-tight text-text-primary">
                Assignments
              </h2>
              {!isLoading && assignments.length > 0 && (
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-0.5 font-mono text-[10px] font-bold text-green-700">
                  {assignments.filter((a) => a.status === "approved").length}
                  /{assignments.length} approved
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-text-muted">
                <ClipboardCheck size={28} className="text-text-disabled" />
                No assignments in your courses yet.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {pending.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                      Action needed
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {pending.map((a) => <AssignmentRow key={a.id} item={a} />)}
                    </div>
                  </div>
                )}
                {reviewed.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                      Submitted
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {reviewed.map((a) => <AssignmentRow key={a.id} item={a} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">

          <ProfileCard user={user} />

          {/* Stats */}
          <div className="flex flex-col gap-2">
            <StatPill
              icon={BookOpenCheck}
              value={courses?.length ?? "—"}
              label="Enrolled courses"
            />
            <StatPill
              icon={CheckCircle2}
              value={progress.completedSubModules.length}
              label="Lessons done"
            />
            <StatPill
              icon={ClipboardCheck}
              value={isLoading ? "—" : pending.length}
              label="Pending tasks"
            />
          </div>

          {/* Dashboard link */}
          {/* <Link
            href="/dashboard"
            className="transition-all duration-200 focus-ring flex items-center gap-2 rounded-lg border border-default bg-white px-3.5 py-3 text-[13px] font-semibold text-text-secondary shadow-sm hover:border-green-300 hover:bg-green-50 hover:text-green-700"
          >
            <LayoutDashboard size={15} />
            Full Dashboard
            <ChevronRight size={13} className="ml-auto opacity-40" />
          </Link> */}
        </aside>

      </div>
    </PageWrapper>
  );
}