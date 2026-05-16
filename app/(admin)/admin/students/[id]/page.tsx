"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Trash2, X, Clock, CheckCircle2, XCircle,
  BookOpen, BarChart2, ClipboardList, User, Calendar,
  Mail, PlusCircle, AlertCircle, TrendingUp, Award,
  Eye, Send, MoreVertical
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { FileViewer } from "@/components/ui/FileViewer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// ── Types ─────────────────────────────────────────────────────────────────────
type StudentDetail = {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  gender?: string;
  dob?: string;
  address?: string;
  student_code?: string;
  enrollment_date?: string;
  created_at: string;
};
type AssignedCourse = {
  course_id: string; title: string; level: string; duration: string;
  assigned_at: string; completedSubModules: number;
  completedSubModuleIds: string[];
  curriculum: any[];
};
type CourseRow = {
  id: string; title: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  assignment_data?: any;
  course_id: string;
  course_title: string;
  submitted_text: string;
  submitted_files?: { url: string; name: string; type: string }[];
  submitted_at: string;
  reviewed_at?: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Progress helpers ─────────────────────────────────────────────────────────
function buildWeekProgress(curriculum: any[], completedIds: string[]) {
  const completedSet = new Set(completedIds);
  return (curriculum || []).map((week: any) => {
    const days = (week.days || []).map((day: any) => {
      const lessons = (day.subModules || []).map((mod: any) => ({
        id: mod.id,
        title: mod.title || mod.assignmentData?.title || mod.id,
        type: mod.type || "lesson",
        done: completedSet.has(mod.id),
      }));
      return { id: day.id, label: day.label || day.title || "Day", lessons };
    });
    const total = days.reduce((a: number, d: any) => a + d.lessons.length, 0);
    const done  = days.reduce((a: number, d: any) => a + d.lessons.filter((l: any) => l.done).length, 0);
    return { id: week.id, title: week.title, days, total, done };
  });
}

const STATUS_CFG = {
  pending:  { label: "Under Review", Icon: Clock,        cls: "bg-amber-50 border-amber-200 text-amber-700",  dot: "bg-amber-400"  },
  approved: { label: "Approved",     Icon: CheckCircle2, cls: "bg-green-50 border-green-200 text-green-700",  dot: "bg-green-500"  },
  rejected: { label: "Revise",       Icon: XCircle,      cls: "bg-red-50 border-red-200 text-red-600",        dot: "bg-red-400"    },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [student,        setStudent]        = useState<StudentDetail | null>(null);
  const [assigned,       setAssigned]       = useState<AssignedCourse[]>([]);
  const [allCourses,     setAllCourses]     = useState<CourseRow[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assigning,      setAssigning]      = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [submissions,    setSubmissions]    = useState<Submission[]>([]);
  const [activeTab,      setActiveTab]      = useState<"courses" | "submissions">("courses");
  const [loadError,      setLoadError]      = useState<string | null>(null);

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRemoveCourseOpen, setIsRemoveCourseOpen] = useState(false);

  async function load() {
    try {
      const [detailRes, coursesRes, subRes] = await Promise.all([
        fetch(`/api/admin/students/${id}`, { credentials: "include" }),
        fetch("/api/admin/courses",         { credentials: "include" }),
        fetch(`/api/admin/assignments?studentId=${id}`, { credentials: "include" }),
      ]);

      if (detailRes.ok) {
        const d = await detailRes.json();
        setStudent(d.student);
        setAssigned(d.courses ?? []);
      } else {
        const err = await detailRes.json().catch(() => ({}));
        setLoadError(`Failed to load student (${detailRes.status}): ${err?.error ?? "Unknown error"}`);
      }

      if (coursesRes.ok) { const d = await coursesRes.json(); setAllCourses(d.courses || []); }
      if (subRes.ok)     { const d = await subRes.json();     setSubmissions(d.submissions || []); }
    } catch (e: any) {
      setLoadError(e?.message ?? "Network error — could not load student data.");
    }
  }

  useEffect(() => { load(); }, [id]);

  const unassigned = allCourses.filter((c) => !assigned.some((a) => a.course_id === c.id));

  async function handleAssign() {
    if (!selectedCourse) return;
    setAssigning(true);
    await fetch(`/api/admin/students/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ courseId: selectedCourse }),
    });
    setSelectedCourse("");
    setAssigning(false);
    load();
  }

  async function handleAction(action: "approve" | "reject") {
    if (!selectedSubmission) return;
    if (action === "reject" && !feedback.trim()) {
      setActionError("Please provide feedback before rejecting.");
      return;
    }
    setActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/assignments/${selectedSubmission.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback }),
      });
      if (!res.ok) throw new Error("Action failed");
      setSelectedSubmission(null);
      setFeedback("");
      await load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActing(false);
    }
  }

  async function handleUnassign(courseId: string) {
    if (!confirm("Are you sure you want to remove this course from the student?")) return;
    await fetch(`/api/admin/students/${id}/assign/${courseId}`, { method: "DELETE", credentials: "include" });
    load();
  }

  async function handleDelete() {
    if (!confirm(`Delete ${student?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/students/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/admin/students");
  }

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalLessons = assigned.reduce((acc, c) => {
    const total = (c.curriculum || []).flatMap((w: any) =>
      (w.days || []).flatMap((d: any) => d.subModules || [])
    ).length;
    return acc + total;
  }, 0);
  const completedLessons = assigned.reduce((acc, c) => acc + c.completedSubModules, 0);
  const overallPct       = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const approvedCount    = submissions.filter((s) => s.status === "approved").length;
  const pendingCount     = submissions.filter((s) => s.status === "pending").length;
  const rejectedCount    = submissions.filter((s) => s.status === "rejected").length;

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center px-6">
        <AlertCircle className="size-8 text-red-500" />
        <p className="font-semibold text-foreground">Failed to load student</p>
        <p className="text-sm text-muted max-w-md">{loadError}</p>
        <button
          onClick={() => { setLoadError(null); load(); }}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RoboLoader size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle">
      {/* ── Top Hero bar ─────────────────────────────────────────────────── */}
      {/* ── Top Hero bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-default relative">
        <div className="px-6 lg:px-10 py-8">
          <div className="mb-10">
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
              All Students
            </Link>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
            {/* Left side: Student Basic Info */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="grid size-24 place-items-center rounded-2xl bg-primary/10 text-4xl font-extrabold text-primary border border-primary/20">
                {getInitials(student.name)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{student.name}</h1>
                <p className="mt-1 text-sm font-mono text-muted uppercase tracking-widest">
                  ID: {student.student_code || student.id.slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Right side: Detailed Grid + Delete Button */}
            <div className="flex flex-col md:flex-row md:items-start gap-10 lg:gap-16">
              {/* Detailed Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                {[
                  { label: "Email Address", value: student.email, Icon: Mail },
                  { label: "Phone Number", value: student.phone_number || "Not provided", Icon: PlusCircle },
                  { label: "Gender", value: student.gender || "Not provided", Icon: User },
                  { label: "Date of Birth", value: student.dob ? fmtDate(student.dob) : "Not provided", Icon: Calendar },
                  { label: "Enrollment Date", value: student.enrollment_date ? fmtDate(student.enrollment_date) : fmtDate(student.created_at), Icon: Clock },
                  { label: "Address", value: student.address || "Not provided", Icon: Award },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                      <item.Icon className="size-3" />
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Three dots menu to the right of details */}
              <div className="shrink-0 pt-2 md:pt-0 relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-xl border border-default bg-white hover:bg-subtle text-muted hover:text-foreground transition-colors shadow-sm"
                >
                  <MoreVertical className="size-5" />
                </button>

                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-default bg-white shadow-lg z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsRemoveCourseOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-subtle transition-colors"
                      >
                        <BookOpen className="size-4" />
                        Remove Course
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleDelete();
                        }}
                        disabled={deleting}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {deleting ? <RoboLoader size="xs" className="text-current" /> : <Trash2 className="size-4" />}
                        Remove Student
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="px-6 lg:px-10 py-8">
        <div className="flex flex-col xl:flex-row gap-6 items-start">

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-default bg-white p-1 shadow-sm w-fit">
              {(["courses", "submissions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab === "courses" ? `Courses (${assigned.length})` : `Submissions (${submissions.length})`}
                </button>
              ))}
            </div>

            {/* ── Courses tab ────────────────────────────────────────── */}
            {activeTab === "courses" && (
              <div className="space-y-3">
                {assigned.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-default bg-white py-14 text-center">
                    <BookOpen size={36} className="text-muted" />
                    <div>
                      <p className="font-semibold text-foreground">No courses assigned</p>
                      <p className="mt-0.5 text-sm text-muted">Use the panel on the right to assign a course.</p>
                    </div>
                  </div>
                ) : (
                  assigned.map((c) => {
                    const weekProgress = buildWeekProgress(c.curriculum || [], c.completedSubModuleIds || []);
                    const total        = weekProgress.reduce((a, w) => a + w.total, 0);
                    const done         = weekProgress.reduce((a, w) => a + w.done,  0);
                    const pct          = total ? Math.round((done / total) * 100) : 0;
                    const courseSubs   = submissions.filter((s) => s.course_id === c.course_id);
                    const courseApproved = courseSubs.filter((s) => s.status === "approved").length;

                    // Find the current week: first week that isn't 100% done
                    const currentWeek = weekProgress.find((w) => w.done < w.total) ?? weekProgress[weekProgress.length - 1];

                    return (
                      <div key={c.course_id} className="rounded-2xl border border-default bg-white shadow-sm overflow-hidden">
                        {/* Course header */}
                        <div className="flex items-start justify-between gap-3 p-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-bold text-foreground">{c.title}</h3>
                              <span className="rounded-full border border-default px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                                {c.level}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-secondary">
                              {c.duration} · Enrolled {fmtDate(c.assigned_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnassign(c.course_id)}
                            className="shrink-0 rounded-lg border border-default p-1.5 text-muted hover:border-red-200 hover:text-red-500 transition-colors"
                            title="Remove course"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        {/* Overall progress bar */}
                        <div className="px-5 pb-4 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary font-medium">Course Progress</span>
                            <span className="font-bold text-primary">{done}/{total} lessons ({pct}%)</span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-subtle">
                            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Current position banner */}
                        {currentWeek && total > 0 && (
                          <div className="mx-5 mb-4 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">Currently on</p>
                            <p className="text-sm font-bold text-primary">{currentWeek.title}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {currentWeek.days.map((day: any) => {
                                const dayDone = day.lessons.filter((l: any) => l.done).length;
                                const dayTotal = day.lessons.length;
                                const isDayComplete = dayDone === dayTotal && dayTotal > 0;
                                return (
                                  <span
                                    key={day.id}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      isDayComplete
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : dayDone > 0
                                        ? "bg-amber-50 border-amber-200 text-amber-700"
                                        : "bg-subtle border-default text-muted"
                                    }`}
                                  >
                                    {isDayComplete ? <CheckCircle2 size={9} /> : dayDone > 0 ? <Clock size={9} /> : null}
                                    {day.label} · {dayDone}/{dayTotal}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Week-by-week breakdown (Accordion) */}
                        {weekProgress.length > 0 && (
                          <div className="border-t border-default">
                            <div className="flex items-center justify-between px-5 py-3 text-xs font-semibold text-muted select-none">
                              <span>Week-by-week breakdown</span>
                              <span className="text-primary">{weekProgress.filter((w) => w.done === w.total && w.total > 0).length}/{weekProgress.length} weeks complete</span>
                            </div>
                            <Accordion type="multiple" defaultValue={currentWeek ? [currentWeek.id] : []} className="divide-y divide-default border-t border-default">
                              {weekProgress.map((week) => (
                                <AccordionItem key={week.id} value={week.id} className="border-b-0">
                                  <AccordionTrigger className="px-5 py-4 hover:bg-subtle/50 transition-colors hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <p className="text-sm font-bold text-foreground">{week.title}</p>
                                      <span className={`text-xs font-bold ${
                                        week.done === week.total && week.total > 0 ? "text-green-600" : week.done > 0 ? "text-amber-600" : "text-muted"
                                      }`}>
                                        {week.done}/{week.total}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="px-5 pb-5 space-y-5 pt-1">
                                      {week.days.map((day:any) => (
                                        <div key={day.id}>
                                          <p className="text-xs font-bold text-muted mb-2.5 uppercase tracking-wider">{day.label}</p>
                                          <div className="flex flex-col gap-1.5 pl-1">
                                            {day.lessons.map((lesson:any) => (
                                              <div
                                                key={lesson.id}
                                                className={`flex items-start gap-2.5 rounded-lg p-2 transition-colors ${
                                                  lesson.done
                                                    ? "bg-green-50/50"
                                                    : "hover:bg-subtle/50"
                                                }`}
                                              >
                                                <div className="mt-0.5 shrink-0">
                                                  {lesson.done ? (
                                                    <CheckCircle2 size={14} className="text-green-600" />
                                                  ) : (
                                                    <div className="size-3.5 rounded-full border border-default bg-subtle" />
                                                  )}
                                                </div>
                                                <span className={`text-sm ${lesson.done ? "text-green-900 font-medium" : "text-foreground"}`}>
                                                  {lesson.title}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        )}

                        {/* Mini assignment stats */}
                        {courseSubs.length > 0 && (
                          <div className="flex gap-3 border-t border-default px-5 py-3">
                            {[
                              { label: "Submitted", value: courseSubs.length, color: "text-foreground" },
                              { label: "Approved",  value: courseApproved,    color: "text-green-700"  },
                              { label: "Pending",   value: courseSubs.filter((s) => s.status === "pending").length, color: "text-amber-600" },
                            ].map(({ label, value, color }) => (
                              <div key={label} className="rounded-lg bg-subtle px-3 py-1.5 text-center">
                                <p className={`text-sm font-bold ${color}`}>{value}</p>
                                <p className="text-[10px] text-muted">{label}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Submissions tab ────────────────────────────────────── */}
            {activeTab === "submissions" && (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-default bg-white py-14 text-center">
                    <ClipboardList size={36} className="text-muted" />
                    <div>
                      <p className="font-semibold text-foreground">No submissions yet</p>
                      <p className="mt-0.5 text-sm text-muted">This student hasn't submitted any assignments.</p>
                    </div>
                  </div>
                ) : (
                  submissions.map((sub) => {
                    const cfg = STATUS_CFG[sub.status];
                    return (
                      <div key={sub.id} className="rounded-2xl border border-default bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground">{sub.assignment_title}</p>
                            <p className="mt-0.5 text-xs text-muted">{sub.course_title}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
                              <cfg.Icon size={11} />
                              {cfg.label}
                            </span>
                            <button
                              onClick={() => { setSelectedSubmission(sub); setFeedback(sub.feedback ?? ""); setActionError(""); }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                            >
                              <Eye className="size-3.5" />
                              Review
                            </button>
                          </div>
                        </div>

                        {/* Submitted text */}
                        <div className="mt-3 rounded-xl bg-subtle border border-default px-4 py-3 text-sm text-secondary whitespace-pre-wrap leading-relaxed">
                          {sub.submitted_text || <span className="text-muted italic">No text submitted.</span>}
                        </div>

                        {/* Feedback */}
                        {sub.feedback && (
                          <div className="mt-2 flex gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-green-700">Admin Feedback</p>
                              <p className="mt-0.5 text-sm text-green-800">{sub.feedback}</p>
                            </div>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="mt-3 flex gap-4 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> Submitted {fmtDateTime(sub.submitted_at)}
                          </span>
                          {sub.reviewed_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={10} /> Reviewed {fmtDateTime(sub.reviewed_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>{/* end main content */}

          {/* ── Right sidebar: Assign Course ──────────────────────────── */}
          <div className="w-full xl:w-72 shrink-0 xl:sticky xl:top-6 space-y-4">

            {/* Assign new course card */}
            <div className="rounded-2xl border border-default bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Assign Course</p>
              {unassigned.length === 0 ? (
                <p className="text-sm text-muted italic">All available courses are already assigned.</p>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Select a course…</option>
                    {unassigned.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedCourse || assigning}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {assigning ? (
                      <RoboLoader size="xs" className="text-current" />
                    ) : (
                      <PlusCircle className="size-4" />
                    )}
                    {assigning ? "Assigning…" : "Assign Course"}
                  </button>
                </div>
              )}
            </div>

            {/* Quick stats card */}
            <div className="rounded-2xl border border-default bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Quick Stats</p>
              <div className="space-y-2">
                {[
                  { label: "Courses Assigned", value: assigned.length, color: "text-primary" },
                  { label: "Assignments Approved", value: approvedCount, color: "text-green-700" },
                  { label: "Pending Review", value: pendingCount, color: "text-amber-600" },
                  { label: "Needs Revision", value: rejectedCount, color: "text-red-600" },
                  { label: "Overall Progress", value: `${overallPct}%`, color: "text-foreground" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-default last:border-0">
                    <span className="text-xs text-muted">{label}</span>
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end sidebar */}

        </div>
      </div>

      {/* ── Review Modal ──────────────────────────────────────────────────────── */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-default">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Assignment Review</p>
                <h2 className="font-display text-lg font-bold text-foreground">{selectedSubmission.assignment_title || "Unknown Assignment"}</h2>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="rounded-full p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Assignment Prompt/Details */}
              {selectedSubmission.assignment_data && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    Assignment Details
                  </h3>
                  {selectedSubmission.assignment_data.description && (
                    <div className="rounded-xl border border-default bg-subtle p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedSubmission.assignment_data.description}
                    </div>
                  )}
                  {/* Admin-uploaded resources */}
                  {selectedSubmission.assignment_data.files && selectedSubmission.assignment_data.files.length > 0 && (
                    <FileViewer
                      files={selectedSubmission.assignment_data.files}
                      title="Reference Materials (Admin)"
                    />
                  )}
                </div>
              )}

              {/* Submission Details */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" />
                  Submitted Content
                </h3>
                <div className="rounded-xl border border-default bg-[#fbfbf9] p-4 text-sm text-secondary whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedSubmission.submitted_text || <span className="italic text-muted">No text provided.</span>}
                </div>
                {/* Student-submitted files */}
                {selectedSubmission.submitted_files && selectedSubmission.submitted_files.length > 0 && (
                  <div className="mt-3">
                    <FileViewer
                      files={selectedSubmission.submitted_files}
                      title="Student's Uploaded Files"
                    />
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="rounded-xl border border-default bg-surface p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Admin Action</h3>
                
                {selectedSubmission.status === "approved" ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-800">Assignment Approved</p>
                      <p className="text-sm text-green-700 mt-1">{selectedSubmission.feedback || "No feedback provided."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                        Feedback (required for rejection)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Great job on..."
                        rows={3}
                        className="w-full rounded-xl border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    
                    {actionError && (
                      <p className="text-sm font-medium text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                        {actionError}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction("approve")}
                        disabled={acting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {acting ? <RoboLoader size="xs" className="text-current" /> : (
                          <>
                            <CheckCircle2 className="size-4" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleAction("reject")}
                        disabled={acting}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {acting ? <RoboLoader size="xs" className="text-current" /> : (
                          <>
                            <XCircle className="size-4" />
                            Request Revision
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Course Modal ──────────────────────────────────────────────────────── */}
      {isRemoveCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-default overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <h2 className="font-display text-lg font-bold text-foreground">Remove Course</h2>
              <button
                onClick={() => setIsRemoveCourseOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {assigned.length === 0 ? (
                <p className="text-sm text-muted">This student is not assigned to any courses.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">Select a course to remove from this student:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {assigned.map((c) => (
                      <div key={c.course_id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-subtle">
                        <span className="text-sm font-medium text-foreground">{c.title}</span>
                        <button
                          onClick={() => {
                            setIsRemoveCourseOpen(false);
                            handleUnassign(c.course_id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
