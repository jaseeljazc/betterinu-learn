"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FileText,
  PlayCircle,
  Wrench,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Course, Day, SubModule, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DocViewer } from "./DocViewer";
import { VideoPlayer } from "./VideoPlayer";
import { AssignmentViewer } from "./AssignmentViewer";
import { QuizViewer } from "./QuizViewer";
import { FileViewer } from "@/components/ui/FileViewer";
import { LessonSectionViewer } from "./LessonSectionViewer";
import BackButton from "@/components/layout/BackButton";

const typeIcons: Record<string, any> = {
  doc: FileText,
  video: PlayCircle,
  exercise: Wrench,
  resource: ExternalLink,
  quiz: HelpCircle,
  assignment: ClipboardCheck,
};

const typeLabels: Record<string, string> = {
  doc: "Reading",
  video: "Video",
  exercise: "Exercise",
  resource: "Resource",
  quiz: "Quiz",
  assignment: "Assignment",
};

function SidebarSubModuleItem({
  courseId,
  weekId,
  module,
  isActive,
  isComplete,
  index,
}: {
  courseId: string;
  weekId: string;
  module: SubModule;
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  const Icon = typeIcons[module.type] || HelpCircle;
  const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (module.type === "assignment") {
      fetch(
        `/api/student/assignments?assignmentId=${module.id}&courseId=${courseId}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.submission) setAssignmentStatus(data.submission.status);
        })
        .catch(() => {});
    }
  }, [module.type, module.id, courseId]);

  return (
    <Link
      href={`/course/${courseId}/learn/${weekId}/${module.id}`}
      className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 ${
        isActive ? "bg-primary/8 shadow-sm" : "hover:bg-surface"
      }`}
    >
      {/* Step number / check indicator */}
      <div
        className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
          isComplete
            ? "bg-primary text-white"
            : isActive
              ? "bg-primary text-white ring-2 ring-primary/20"
              : "bg-surface border border-default text-muted"
        }`}
      >
        {isComplete ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`truncate text-[13px] font-semibold leading-snug transition-colors ${
            isActive
              ? "text-primary"
              : "text-foreground group-hover:text-primary"
          }`}
        >
          {module.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <Icon
            className={`size-3 ${isActive ? "text-primary/50" : "text-muted"}`}
          />
          <span
            className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? "text-primary/50" : "text-muted"}`}
          >
            {typeLabels[module.type] || module.type}
          </span>
          {module.duration && (
            <>
              <span className="text-muted">·</span>
              <span className="text-[10px] text-muted">{module.duration}</span>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      {module.type === "assignment" &&
        assignmentStatus === "pending" &&
        !isComplete && (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
            Pending
          </span>
        )}
      {module.type === "assignment" &&
        assignmentStatus === "rejected" &&
        !isComplete && (
          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700">
            Revise
          </span>
        )}
    </Link>
  );
}

function flatten(week: Week) {
  return week.days.flatMap((day) =>
    day.subModules.map((module) => ({ day, module })),
  );
}

export function LessonViewerClient({
  course,
  week,
  day,
  subModule,
}: {
  course: Course;
  week: Week;
  day: Day;
  subModule: SubModule;
}) {
  const { isSubModuleComplete, markSubModuleComplete } = useProgress();
  const modules = flatten(week);
  const index = modules.findIndex((item) => item.module.id === subModule.id);
  const previous = modules[index - 1];
  const next = modules[index + 1];
  const completeCount = modules.filter((item) =>
    isSubModuleComplete(item.module.id),
  ).length;
  const complete = isSubModuleComplete(subModule.id);
  const progressPercent = Math.round((completeCount / modules.length) * 100);

  const currentDayIndex = week.days.findIndex((d) => d.id === day.id);
  let isCurrentDayLocked = false;
  let lockedReason =
    "You must fully complete all lessons in the previous day before accessing this content.";

  if (currentDayIndex > 0) {
    const prevDay = week.days[currentDayIndex - 1];
    const prevComplete = prevDay.subModules.every((m) =>
      isSubModuleComplete(m.id),
    );
    if (!prevComplete) {
      isCurrentDayLocked = true;
      if (
        prevDay.subModules.some(
          (m) =>
            m.type === "assignment" &&
            (!m.assignmentData || m.assignmentData.requiresApproval !== false),
        )
      ) {
        lockedReason =
          "The previous day contains an assignment that requires admin approval before you can proceed.";
      }
    }
  }

  if (isCurrentDayLocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
          <Lock className="size-9 text-amber-500" aria-hidden />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Day Locked
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-secondary">
          {lockedReason}
        </p>
        <Link
          className={
            buttonVariants({ variant: "outline" }) +
            " mt-8 gap-2 rounded-xl border-default px-5"
          }
          href={`/course/${course.id}/learn`}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to Curriculum
        </Link>
      </div>
    );
  }

  const ContentIcon = typeIcons[subModule.type] || HelpCircle;

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      {/* ─── DARK SIDEBAR ─── */}
      <aside className="hidden lg:flex lg:w-72 xl:w-96 shrink-0 flex-col h-full overflow-hidden bg-background border-r border-default">
        <div className="flex h-full flex-col overflow-hidden">
          {/* Sidebar header */}
          <div className="border-b border-default p-5">
            <Link
              href={`/course/${course.id}/learn`}
              className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5" />
              Curriculum
            </Link>

            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-surface border border-default px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary">
                {week.title}
              </span>
            </div>
            <h3 className="text-base font-bold leading-snug text-foreground">
              {day.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted">{day.label}</p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Progress
                </span>
                <span className="text-[10px] font-bold text-secondary">
                  {completeCount}/{modules.length}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Module list — scrollbar on LEFT side via direction:rtl trick */}
          <div
            className="flex-1 overflow-y-auto sidebar-left-scroll"
            style={{ direction: "rtl" }}
          >
            <div style={{ direction: "ltr" }}>
              <div className="p-3 space-y-0.5">
                {day.subModules.map((mod, idx) => (
                  <SidebarSubModuleItem
                    key={mod.id}
                    module={mod}
                    courseId={course.id}
                    weekId={week.id}
                    isActive={mod.id === subModule.id}
                    isComplete={isSubModuleComplete(mod.id)}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar scrollbar styles */}
        <style>{`
          .sidebar-left-scroll::-webkit-scrollbar {
            width: 3px;
          }
          .sidebar-left-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-left-scroll::-webkit-scrollbar-thumb {
            background-color: var(--color-border-primary, #d1d5db);
            border-radius: 9999px;
          }
          .sidebar-left-scroll::-webkit-scrollbar-thumb:hover {
            background-color: var(--color-text-tertiary, #9ca3af);
          }
          .sidebar-left-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--color-border-primary, #d1d5db) transparent;
          }
        `}</style>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 min-w-0 h-full bg-white flex flex-col overflow-hidden">
        {/* Top breadcrumb bar — fixed relative to this column, never scrolls */}
        <div className="shrink-0 border-b border-default bg-background px-6 lg:px-10 py-3 z-10">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Link
              className="font-semibold transition-colors hover:text-primary"
              href={`/course/${course.id}`}
            >
              {course.title}
            </Link>
            <ChevronRight className="size-3 text-muted" />
            <span className="text-muted">{week.title}</span>
            <ChevronRight className="size-3 text-muted" />
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {subModule.title}
            </span>
          </div>
        </div>

        {/* Scrollable content area — scrollbar hidden */}
        <div
          className="flex-1 overflow-y-auto"
          style={
            {
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            } as React.CSSProperties
          }
        >
          <style>{`
            .main-content-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="flex flex-col min-h-full main-content-scroll">
            {/* Content area */}
            <div className="px-6 lg:px-10 xl:px-14 pt-4 pb-40 max-w-4xl w-full">
              {/* Lesson header */}
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-default px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-secondary">
                    <ContentIcon className="size-3" aria-hidden />
                    {typeLabels[subModule.type] || subModule.type}
                  </span>
                  {complete && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                      <CheckCircle2 className="size-3" aria-hidden />
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl leading-tight">
                  {subModule.title}
                </h1>

                {subModule.duration && (
                  <p className="mt-2 text-sm text-secondary">
                    Estimated time · {subModule.duration}
                  </p>
                )}

                <div className="mt-6 mb-2 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
              </div>

              {/* Content renderer */}
              <div className="flex-1 flex flex-col pb-10">
                {subModule.type === "video" ? (
                  <div className="space-y-6">
                    <VideoPlayer module={subModule} />
                    {subModule.attachedFiles?.length ? (
                      <FileViewer
                        files={subModule.attachedFiles}
                        title="Lesson Attachments"
                      />
                    ) : null}
                  </div>
                ) : subModule.type === "doc" || subModule.type === "lesson" ? (
                  <div className="space-y-6">
                    {subModule.sections?.length ? (
                      <LessonSectionViewer
                        sections={subModule.sections}
                        pagePadding={subModule.pagePadding}
                        pageBgColor={subModule.pageBgColor}
                      />
                    ) : (
                      <DocViewer content={subModule.content ?? ""} />
                    )}
                    {subModule.attachedFiles?.length ? (
                      <FileViewer
                        files={subModule.attachedFiles}
                        title="Lesson Attachments"
                      />
                    ) : null}
                  </div>
                ) : subModule.type === "mixed" ? (
                  <div className="space-y-12">
                    {(subModule.blocks || []).map((block, bIdx) => (
                      <div key={bIdx} className="space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
                            {block.title}
                          </h3>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        {block.kind === "video" ? (
                          <VideoPlayer
                            module={{
                              ...subModule,
                              videoUrl: block.videoUrl,
                              description: block.description,
                            }}
                          />
                        ) : (
                          <DocViewer content={block.content} />
                        )}
                      </div>
                    ))}
                    {subModule.attachedFiles?.length ? (
                      <FileViewer
                        files={subModule.attachedFiles}
                        title="Lesson Attachments"
                      />
                    ) : null}
                  </div>
                ) : subModule.type === "quiz" ? (
                  <QuizViewer
                    moduleId={subModule.id}
                    courseId={course.id}
                    weekId={week.id}
                    dayId={day.id}
                    quizData={
                      subModule.quizData || { questions: [], passingScore: 70 }
                    }
                    onPass={() =>
                      markSubModuleComplete(
                        subModule.id,
                        day.id,
                        day.subModules.map((m) => m.id),
                      )
                    }
                  />
                ) : subModule.type === "assignment" ? (
                  <AssignmentViewer
                    module={subModule}
                    courseId={course.id}
                    weekId={week.id}
                    dayId={day.id}
                    onApprovedComplete={() =>
                      markSubModuleComplete(
                        subModule.id,
                        day.id,
                        day.subModules.map((m) => m.id),
                      )
                    }
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-default p-10 text-center text-secondary text-sm">
                    Unknown content type
                  </div>
                )}
              </div>

              {/* External links */}
              {subModule.externalLinks?.length ? (
                <section className="mt-14">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                      External Resources
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {subModule.externalLinks.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="group flex items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2 text-sm font-semibold text-secondary transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <ExternalLink className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        {/* ─── FIXED FOOTER NAV ─── */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-white/95 px-6 py-2 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
          <div className="mx-auto grid max-w-7xl grid-cols-3 items-center gap-4">
            {/* Left: Previous */}
            <div className="justify-self-start">
              {previous ? (
                <Link
                  className="flex items-center gap-2 rounded-xl border border-default bg-surface px-4 py-2 text-sm font-semibold text-secondary transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  href={`/course/${course.id}/learn/${week.id}/${previous.module.id}`}
                >
                  <ChevronLeft className="size-4 shrink-0" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              ) : null}
            </div>

            {/* Center: Complete / Status */}
            <div className="justify-self-center">
              {subModule.type !== "quiz" && subModule.type !== "assignment" ? (
                <button
                  onClick={() =>
                    markSubModuleComplete(
                      subModule.id,
                      day.id,
                      day.subModules.map((m) => m.id),
                    )
                  }
                  type="button"
                  className={`flex min-w-[160px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-sm active:scale-95 ${
                    complete
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                      : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                  }`}
                >
                  {complete && <CheckCircle2 className="size-4 shrink-0" />}
                  {complete ? "Completed" : "Mark Complete"}
                </button>
              ) : (
                <div className="flex items-center justify-center">
                  {complete ? (
                    <span className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> Completed
                    </span>
                  ) : (
                    <span className="text-xs text-muted">
                      {subModule.type === "quiz"
                        ? "Pass the quiz to complete"
                        : "Awaiting instructor approval"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Next */}
            <div className="justify-self-end">
              {next ? (
                next.day.id !== day.id &&
                !day.subModules.every((m) => isSubModuleComplete(m.id)) ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-default px-4 py-2 text-sm font-semibold text-muted opacity-50">
                      <Lock className="size-3.5 shrink-0" />
                      <span className="hidden sm:inline">Locked</span>
                    </span>
                    {day.subModules.some((m) => m.type === "assignment") && (
                      <span className="text-[10px] font-semibold text-amber-600">
                        Pending approval
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    className="flex items-center gap-2 rounded-xl border border-default bg-surface px-4 py-2 text-sm font-semibold text-secondary transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                    href={`/course/${course.id}/learn/${week.id}/${next.module.id}`}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                )
              ) : (
                <Link
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 shadow-primary/20 active:scale-95"
                  href={`/course/${course.id}/learn`}
                >
                  Finish Week
                  <ChevronRight className="size-4 shrink-0" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
