"use client";

import { useMemo } from "react";
import type { CourseId, Day } from "@/types";
import { AccordionItem } from "@/components/ui/accordion";
import { useProgress } from "@/lib/hooks/useProgress";
import { ProgressBar } from "./ProgressBar";
import { SubModuleItem } from "./SubModuleItem";
import { CompletionBadge } from "./CompletionBadge";

export function ModuleAccordion({ courseId, weekId, day }: { courseId: CourseId; weekId: string; day: Day }) {
  const { isSubModuleComplete, isDayComplete } = useProgress();
  const completeCount = useMemo(
    () => day.subModules.filter((module) => isSubModuleComplete(module.id)).length,
    [day.subModules, isSubModuleComplete],
  );
  const percent = Math.round((completeCount / day.subModules.length) * 100);

  return (
    <section className="rounded-xl border border-default bg-surface p-5" id={day.id}>
      <AccordionItem
        defaultOpen={false}
        title={
          <span className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="block text-sm font-bold uppercase text-muted">{day.label}</span>
              <span className="font-display text-xl font-bold">{day.title}</span>
            </span>
            <CompletionBadge complete={isDayComplete(day.id)} />
          </span>
        }
      >
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-muted">
            <span>Day progress</span>
            <span>{completeCount} / {day.subModules.length}</span>
          </div>
          <ProgressBar value={percent} label={`${day.title} progress`} />
        </div>
        <div className="grid gap-3">
          {day.subModules.map((module) => (
            <SubModuleItem courseId={courseId} key={module.id} module={module} weekId={weekId} />
          ))}
        </div>
      </AccordionItem>
    </section>
  );
}
