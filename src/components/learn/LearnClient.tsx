"use client";

import type { Course } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/lib/hooks/useProgress";
import { LockedWeekCard } from "./LockedWeekCard";
import { WeekCard } from "./WeekCard";

export function LearnClient({ course }: { course: Course }) {
  const { isWeekUnlocked } = useProgress();
  const activeWeek = course.weeks.find((week) => isWeekUnlocked(course.id, week.id)) ?? course.weeks[0];

  return (
    <div className="flex gap-8">
      <Sidebar activeWeekId={activeWeek.id} course={course} />
      <div className="min-w-0 flex-1 space-y-8">
        <header className="rounded-xl border border-default bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold">{activeWeek.title.replace(":", " -")}</h1>
            {activeWeek.isShared ? <Badge variant="course">Shared with MERN and Python</Badge> : null}
          </div>
          <p className="mt-2 text-secondary">Complete daily lessons, then pass the weekly quiz to unlock the next week.</p>
        </header>
        {course.weeks.map((week, index) =>
          isWeekUnlocked(course.id, week.id) ? (
            <WeekCard courseId={course.id} key={week.id} week={week} />
          ) : (
            <LockedWeekCard key={week.id} previousWeekNumber={index} week={week} />
          ),
        )}
      </div>
    </div>
  );
}
