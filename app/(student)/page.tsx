"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  GraduationCap,
  User2,
  XCircle,
  Flame,
  TrendingUp,
  Star,
  ArrowRight,
  Globe,
  BookOpen,
} from "lucide-react";
import { clientAuth } from "@/lib/firebase-client";
import { useProgress } from "@/lib/hooks/useProgress";
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

interface StandaloneAssignment {
  assignment_id: string;
  title: string;
  due_date: string | null;
  scope: "course" | "common";
  course_title: string | null;
  submission_id: string | null;
  submission_status: "pending" | "approved" | "rejected" | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  todo: {
    Icon: AlertCircle,
    label: "To Do",
    cls: "bg-blue-50 border-blue-100 text-blue-600",
    dot: "bg-blue-400",
  },
  pending: {
    Icon: Clock,
    label: "Under Review",
    cls: "bg-amber-50 border-amber-200 text-amber-600",
    dot: "bg-amber-400",
  },
  approved: {
    Icon: CheckCircle2,
    label: "Approved",
    cls: "bg-green-50 border-green-100 text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    Icon: XCircle,
    label: "Revise",
    cls: "bg-red-50 border-red-100 text-red-600",
    dot: "bg-red-400",
  },
};

const SORT_ORDER = { todo: 0, rejected: 1, pending: 2, approved: 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string | null) {
  if (!name) return "S";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function fmtDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buildAssignments(
  courses: Course[],
  submissions: Submission[],
): FlatAssignment[] {
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

function AssignmentRow({ item }: { item: FlatAssignment }) {
  const cfg = STATUS_CONFIG[item.status];
  const href = `/course/${item.course_id}/learn/${item.week_id}/${item.assignment_id}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border border-default bg-white p-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-ring"
    >
      <span className={`size-2 shrink-0 rounded-full ${cfg.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.assignment_title}
        </p>
        <p className="truncate text-[11px] text-muted">{item.course_title}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}
      >
        <cfg.Icon size={10} />
        {cfg.label}
      </span>
      <ChevronRight
        size={13}
        className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

function CourseCard({
  course,
  assignments,
}: {
  course: Course;
  assignments: FlatAssignment[];
}) {
  const courseAssignments = assignments.filter(
    (a) => a.course_id === course.id,
  );
  const approvedCount = courseAssignments.filter(
    (a) => a.status === "approved",
  ).length;
  const pct = courseAssignments.length
    ? Math.round((approvedCount / courseAssignments.length) * 100)
    : 0;

  return (
    <Link
      href={`/course/${course.id}`}
      className="group relative flex flex-col overflow-hidden rounded-md border border-default bg-white  transition-all duration-300 hover:border-primary/30 hover:shadow-lg focus-ring"
    >
      {/* Course image / fallback */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        {course.image ? (
          <Image
            src={course.image}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-102 "
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="size-10 text-primary/30" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary  backdrop-blur-">
          Course
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-muted">
              {course.description}
            </p>
          )}
        </div>

        {/* {courseAssignments.length > 0 && (
          <div className="mt-auto flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-primary">
              {approvedCount}/{courseAssignments.length}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">
            {courseAssignments.length} assignment{courseAssignments.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Continue <ArrowRight size={11} />
          </span>
        </div> */}
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { progress } = useProgress();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [allStandaloneTasks, setAllStandaloneTasks] = useState<
    StandaloneAssignment[] | null
  >(null);
  const [newTasks, setNewTasks] = useState<StandaloneAssignment[] | null>(null);

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

    fetch("/api/student/standalone-assignments", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const tasks = d.assignments ?? [];
        setAllStandaloneTasks(tasks);
        setNewTasks(
          tasks.filter((t: StandaloneAssignment) => !t.submission_id),
        );
      })
      .catch(() => {
        setAllStandaloneTasks([]);
        setNewTasks([]);
      });
  }, []);

  const isLoading = courses === null || submissions === null;
  const assignments = isLoading ? [] : buildAssignments(courses, submissions);
  // Only show assignments the student has actually submitted (exclude "todo")
  const submitted = assignments.filter((a) => a.status !== "todo");
  const pending = assignments.filter((a) => a.status === "rejected"); // needs revision
  const reviewed = assignments.filter(
    (a) => a.status === "pending" || a.status === "approved",
  );
  const approvedAll = assignments.filter((a) => a.status === "approved").length;

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl pt-5">
        {/* --- Hero / Greeting Banner --- */}
        <div className="mb-8 overflow-hidden rounded-md border border-default bg-white  relative">
          {isLoading ? (
            <>
              <div className="px-6 py-7 sm:p-8">
                <Skeleton className="mb-4 h-3 w-32" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-64 sm:w-80" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-default px-6 py-3 sm:px-8">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="px-6 py-7 sm:p-8">
                {/* Eyebrow — date */}
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>

                {/* Main greeting + stats row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
                      {getGreeting()}
                      {user?.displayName
                        ? `, ${user.displayName.split(" ")[0]}`
                        : ""}
                      .
                    </h1>
                    <p className="mt-1.5 text-sm text-secondary">
                      Here&apos;s your learning snapshot for today.
                    </p>
                  </div>

                  {/* Inline stat chips */}
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {[
                      {
                        Icon: BookOpenCheck,
                        value: courses?.length ?? "—",
                        label: "Courses",
                        accent: "bg-primary/8 text-primary border-primary/15",
                      },
                      {
                        Icon: CheckCircle2,
                        value: progress.completedSubModules.length,
                        label: "Completed",
                        accent:
                          "bg-emerald-50 text-emerald-700 border-emerald-100",
                      },
                      {
                        Icon: ClipboardCheck,
                        value: pending.length,
                        label: "Pending",
                        accent: "bg-amber-50 text-amber-700 border-amber-100",
                      },
                    ].map(({ Icon, value, label, accent }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 rounded-md border px-3.5 py-2 ${accent}`}
                      >
                        <Icon size={14} className="shrink-0 opacity-80" />
                        <span className="text-lg font-bold leading-none">
                          {value}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User footer */}
              <div className="flex items-center gap-3 border-t border-default px-6 py-3 sm:px-8">
                <Avatar className="size-6 border border-default">
                  <AvatarFallback className="bg-primary/10 text-[9px] font-bold text-primary">
                    {user ? getInitials(user.displayName) : "S"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-secondary flex-1 truncate">
                  {user?.email ?? "Loading..."}
                </span>
              </div>
            </>
          )}
        </div>

        {/* --- Three-column layout --- */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {/* --- Courses column --- */}
          <section className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">
                My Courses
              </h2>
              {courses && courses.length > 0 && (
                <span className="text-[11px] text-muted">
                  {courses.length} enrolled
                </span>
              )}
            </div>

            {courses === null ? (
              <div className="flex flex-col gap-4">
                {[1].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-md border border-default bg-white overflow-hidden "
                  >
                    <Skeleton className="aspect-[16/7] w-full rounded-none" />
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <Skeleton className="mb-2 h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="mt-1 h-3 w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
                <GraduationCap size={36} className="text-muted" />
                <div>
                  <p className="font-semibold text-foreground">
                    No courses yet
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Contact your admin to get enrolled.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    assignments={assignments}
                  />
                ))}
              </div>
            )}
          </section>

          {/* --- Other Tasks column --- */}
          <section className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">
                Other Tasks
              </h2>
              <Link
                href="/assignments"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                View all →
              </Link>
            </div>

            {isLoading || allStandaloneTasks === null ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : allStandaloneTasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
                <Globe size={36} className="text-muted" />
                <div>
                  <p className="font-semibold text-foreground">No tasks yet</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Standalone assignments will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-default bg-white  overflow-hidden flex flex-col flex-1">
                <div className="overflow-y-auto flex-1 p-4">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <Globe className="size-3" /> Standalone Tasks ·{" "}
                    {allStandaloneTasks.length}
                    {(newTasks?.length ?? 0) > 0 && (
                      <span className="ml-1 rounded-full bg-primary text-white text-[9px] font-bold px-1.5 py-0.5">
                        {newTasks!.length} new
                      </span>
                    )}
                  </p>
                  <div className="flex flex-col gap-2">
                    {allStandaloneTasks.map((task) => {
                      const status = task.submission_status ?? "todo";
                      const statusMap: Record<
                        string,
                        { dot: string; badge: string; label: string }
                      > = {
                        todo: {
                          dot: "bg-blue-400",
                          badge: "bg-blue-50 border-blue-200 text-blue-700",
                          label: "To Do",
                        },
                        pending: {
                          dot: "bg-amber-400",
                          badge: "bg-amber-50 border-amber-200 text-amber-700",
                          label: "Review",
                        },
                        approved: {
                          dot: "bg-green-500",
                          badge: "bg-green-50 border-green-200 text-green-700",
                          label: "Approved",
                        },
                        rejected: {
                          dot: "bg-red-400",
                          badge: "bg-red-50 border-red-200 text-red-600",
                          label: "Revise",
                        },
                      };
                      const cfg = statusMap[status] ?? statusMap.todo;
                      return (
                        <Link
                          key={task.assignment_id}
                          href={`/assignments/${task.assignment_id}`}
                          className="group flex items-center gap-3 rounded-md border border-default bg-white p-3 transition-all hover:border-primary/30 hover:shadow-md"
                        >
                          <span
                            className={`size-2 shrink-0 rounded-full ${cfg.dot}${status === "todo" ? " animate-pulse" : ""}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {task.title}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {task.scope === "common"
                                ? "Common Task"
                                : (task.course_title ?? "Standalone")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          <ChevronRight
                            size={13}
                            className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* --- Course Tasks column --- */}
          <section className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">
                Course Tasks
              </h2>
              <Link
                href="/assignments"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                View all →
              </Link>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : submitted.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
                <BookOpenCheck size={36} className="text-muted" />
                <div>
                  <p className="font-semibold text-foreground">No tasks yet</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Course assignments will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-default bg-white  overflow-hidden flex flex-col flex-1">
                <div className="overflow-y-auto flex-1 p-4">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <BookOpenCheck className="size-3" /> Course Tasks ·{" "}
                    {submitted.length}
                  </p>
                  <div className="flex flex-col gap-2">
                    {submitted.map((a) => (
                      <AssignmentRow key={a.id} item={a} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
