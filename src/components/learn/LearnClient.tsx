"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Course } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { useProgress } from "@/lib/hooks/useProgress";
import { LockedWeekCard } from "./LockedWeekCard";
import { WeekCard } from "./WeekCard";

export function LearnClient({ course }: { course: Course }) {
  const { isWeekUnlocked } = useProgress();
  
  // Pad the weeks to 30 to show upcoming weeks as locked.
  const paddedWeeks = Array.from({ length: 30 }).map((_, index) => {
    if (index < course.weeks.length) return course.weeks[index];
    return {
      id: `dummy-week-${index + 1}`,
      title: `Week ${index + 1}: Coming Soon`,
      isLocked: true,
      isShared: false,
      days: []
    } as any;
  });

  const paddedCourse = { ...course, weeks: paddedWeeks };
  const activeWeek = paddedCourse.weeks.find((week: any) => isWeekUnlocked(paddedCourse, week.id) && !week.id.startsWith("dummy")) ?? paddedCourse.weeks[0];

  return (
    <div className="flex gap-10">
      <Sidebar activeWeekId={activeWeek.id} course={paddedCourse} />
      <div className="min-w-0 flex-1 space-y-6">
        {/* Course header */}
        <header className="rounded-lg border border-default bg-white overflow-hidden">
          <div className="p-6">
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:text-primary transition-colors mb-4 focus-ring rounded-sm">
              <ChevronLeft className="size-3.5" aria-hidden />
              Back to Dashboard
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{course.title}</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
              {activeWeek.title.replace(":", " —")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
              Complete daily lessons, then pass the weekly quiz to unlock the next week. Keep up your streak for bonus XP!
            </p>
          </div>
        </header>

        {paddedCourse.weeks.map((week: any, index: number) =>
          isWeekUnlocked(paddedCourse, week.id) && !week.id.startsWith("dummy") ? (
            <WeekCard courseId={paddedCourse.id} key={week.id} week={week} />
          ) : (
            <LockedWeekCard key={week.id} previousWeekNumber={index} week={week} />
          ),
        )}
      </div>
    </div>
  );
}
