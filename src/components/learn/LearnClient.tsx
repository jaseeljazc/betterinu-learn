"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
      days: [],
    } as any;
  });

  const paddedCourse = { ...course, weeks: paddedWeeks };
  const activeWeek =
    paddedCourse.weeks.find(
      (week: any) =>
        isWeekUnlocked(paddedCourse, week.id) && !week.id.startsWith("dummy"),
    ) ?? paddedCourse.weeks[0];

  return (
    <div className="flex gap-10">
      <Sidebar activeWeekId={activeWeek.id} course={paddedCourse} />
      <div className="min-w-0 flex-1 space-y-4">
        {/* Course header */}
        <div className="rounded-lg border border-default bg-white overflow-hidden">
          <div className="p-6 ">
            <nav
              className="flex items-center gap-2 text-xs font-semibold text-muted mb-4"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight size={12} className="opacity-50" />
              <Link
                href={`/course/${course.id}`}
                className="hover:text-primary transition-colors"
              >
                {course.title}
              </Link>
              <ChevronRight size={12} className="opacity-50" />
              <span className="text-foreground">Learn</span>
            </nav>
            <p className="text-[16px] font-bold uppercase tracking-widest text-primary">
              Course material
            </p>
            {/* <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
              {activeWeek.title.replace(":", " —")}
            </h1> */}
          </div>
        </div>

        {paddedCourse.weeks.map((week: any, index: number) =>
          isWeekUnlocked(paddedCourse, week.id) &&
          !week.id.startsWith("dummy") ? (
            <WeekCard courseId={paddedCourse.id} key={week.id} week={week} />
          ) : (
            <LockedWeekCard
              key={week.id}
              previousWeekNumber={index}
              week={week}
            />
          ),
        )}
      </div>
    </div>
  );
}
