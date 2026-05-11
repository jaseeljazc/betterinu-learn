"use client";

import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import type { Course } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function Sidebar({ course, activeWeekId }: { course: Course; activeWeekId?: string }) {
  const { getCourseProgress, isDayComplete, isWeekUnlocked } = useProgress();

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-64 shrink-0 overflow-y-auto border-r border-muted pr-5 lg:block">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase text-muted">Course progress</p>
        <h2 className="mt-2 font-display text-xl font-bold">{course.title}</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-full border border-course bg-course-soft text-sm font-bold text-course">
            {getCourseProgress(course.id)}%
          </div>
          <Progress value={getCourseProgress(course.id)} className="flex-1" label={`${course.title} progress`} />
        </div>
      </div>

      <nav className="grid gap-3" aria-label="Course weeks">
        {course.weeks.map((week) => {
          const unlocked = isWeekUnlocked(course.id, week.id);
          const active = activeWeekId === week.id;
          return (
            <section className="rounded-lg border border-muted bg-surface p-3" key={week.id}>
              <div className="flex items-center justify-between gap-2">
                <Link
                  aria-disabled={!unlocked}
                  className={unlocked ? "font-semibold text-foreground focus-ring" : "pointer-events-none font-semibold text-muted"}
                  href={`/course/${course.id}/learn#${week.id}`}
                >
                  {week.title.replace(":", " -")}
                </Link>
                {unlocked ? null : <Lock className="size-4 animate-lock-pulse text-[var(--amber-600)]" aria-hidden />}
              </div>
              {week.isShared ? <Badge className="mt-2" variant="course">Shared module</Badge> : null}
              {active && unlocked ? (
                <div className="mt-3 grid gap-2">
                  {week.days.map((day) => (
                    <a className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-secondary hover:text-foreground focus-ring" href={`#${day.id}`} key={day.id}>
                      {isDayComplete(day.id) ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <span className="size-4 rounded-full border border-muted" />}
                      {day.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
