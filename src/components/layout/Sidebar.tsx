"use client";

import Link from "next/link";
import { CheckCircle2, Lock, LayoutList } from "lucide-react";
import type { Course } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";

export function Sidebar({ course, activeWeekId }: { course: Course; activeWeekId?: string }) {
  const { getCourseProgress, isDayComplete, isWeekUnlocked } = useProgress();
  const progress = getCourseProgress(course);

  return (
    <aside className="sticky top-[84px] hidden h-[calc(100vh-84px)] w-100 shrink-0 overflow-y-auto overflow-x-hidden border-r border-default pr-6 lg:block">
      {/* Course progress block */}
      <div className="mb-5 rounded-lg border border-default bg-white overflow-hidden">
        <div className="border-b border-primary bg-primary px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-200">Course Progress</p>
          <p className="mt-0.5 text-sm font-bold text-white truncate">{course.title}</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2 text-xs font-semibold">
            <span className="text-muted">Overall</span>
            <span className="text-primary font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-subtle overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: "var(--green-700)" }}
            />
          </div>
        </div>
      </div>

      {/* Curriculum nav label */}
      <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-widest text-muted">
        <LayoutList className="size-3.5" />
        Curriculum
      </div>

      <nav className="grid gap-1.5" aria-label="Course weeks">
        {course.weeks.map((week) => {
          const unlocked = isWeekUnlocked(course, week.id);
          const active = activeWeekId === week.id;
          return (
            <section
              className={`rounded-sm border transition-all ${active ? "border-primary bg-primary/5" : "border-default bg-white hover:border-strong"}`}
              key={week.id}
            >
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    aria-disabled={!unlocked}
                    className={`text-xs leading-snug ${unlocked
                      ? active
                        ? "font-bold text-primary"
                        : "font-semibold text-foreground hover:text-primary"
                      : "pointer-events-none font-semibold text-muted"
                    } focus-ring`}
                    href={`/course/${course.id}/learn#${week.id}`}
                  >
                    {week.title.replace(":", " —")}
                  </Link>
                  {!unlocked && <Lock className="size-3 shrink-0 text-muted" aria-hidden />}
                </div>

                {active && unlocked ? (
                  <div className="mt-2.5 grid gap-0.5 border-t border-default pt-2">
                    {week.days.map((day) => (
                      <a
                        className="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] text-secondary transition-colors hover:bg-subtle hover:text-foreground focus-ring"
                        href={`#${day.id}`}
                        key={day.id}
                      >
                        {isDayComplete(day.id) ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
                        ) : (
                          <span className="size-3.5 shrink-0 rounded-full border border-strong bg-white transition-colors group-hover:border-primary" />
                        )}
                        <span className="truncate font-medium min-w-0 flex-1">{day.label} — {day.title}</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
