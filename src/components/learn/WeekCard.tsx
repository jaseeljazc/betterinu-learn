"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { CourseId, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { ModuleAccordion } from "./ModuleAccordion";

export function WeekCard({ courseId, week }: { courseId: CourseId; week: Week }) {
  const { areAllWeekDaysComplete, hasPassedQuiz, isSubModuleComplete } = useProgress();
  const allSubModules = week.days.flatMap((day) => day.subModules);
  const complete = allSubModules.filter((module) => isSubModuleComplete(module.id)).length;
  const percent = allSubModules.length ? Math.round((complete / allSubModules.length) * 100) : 0;
  const daysComplete = areAllWeekDaysComplete(courseId, week.id);
  const passed = hasPassedQuiz(courseId, week.id);

  return (
    <section className="space-y-5" id={week.id}>
      <div className="rounded-xl border border-default bg-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">{week.title.replace(":", " -")}</h2>
              {week.isShared ? (
                <Badge title="This module is identical across MERN Stack and Python courses" variant="course">
                  <Zap className="size-3" aria-hidden />
                  Shared Module
                </Badge>
              ) : null}
              {passed ? <Badge variant="success">Quiz passed</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-secondary">{complete} of {allSubModules.length} sub-modules complete</p>
          </div>
          <div className="w-full md:w-64">
            <ProgressBar value={percent} label={`${week.title} progress`} />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {week.days.map((day) => (
          <ModuleAccordion courseId={courseId} day={day} key={day.id} weekId={week.id} />
        ))}
      </div>

      {daysComplete ? (
        <div className="rounded-xl border border-course bg-course-soft p-5">
          <p className="font-display text-xl font-bold text-course">Week complete. Your quiz is ready.</p>
          <p className="mt-2 text-sm text-secondary">Pass the checkpoint to unlock the next week.</p>
          <Link className={buttonClasses({ className: "mt-4 animate-xp-pop", size: "lg" })} href={`/quiz/${courseId}/${week.id}`}>
            Take Week Quiz
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
