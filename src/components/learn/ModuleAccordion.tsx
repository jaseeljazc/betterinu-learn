"use client";

import { useMemo } from "react";
import type { CourseId, Day } from "@/types";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProgress } from "@/lib/hooks/useProgress";
import { ProgressBar } from "./ProgressBar";
import { SubModuleItem } from "./SubModuleItem";
import { CompletionBadge } from "./CompletionBadge";

import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ModuleAccordion({ courseId, weekId, day, isLocked }: { courseId: CourseId; weekId: string; day: Day; isLocked?: boolean }) {
  const { isSubModuleComplete, isDayComplete } = useProgress();
  const completeCount = useMemo(
    () => day.subModules.filter((module) => isSubModuleComplete(module.id)).length,
    [day.subModules, isSubModuleComplete],
  );
  const percent = day.subModules.length ? Math.round((completeCount / day.subModules.length) * 100) : 0;

  return (
    <section className={`rounded-2xl border border-default bg-white px-2 py-0 shadow-sm transition-opacity ${isLocked ? "opacity-60 grayscale-[0.2]" : ""}`} id={day.id}>
      <AccordionItem
        value={day.id}
        className="border-b-0"
      >
        <AccordionTrigger className="hover:no-underline px-2 py-4 [&[data-state=open]>span>svg]:rotate-180">
          <span className="flex w-full flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between text-left">
            <span className="flex items-center gap-3">
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-primary">{day.label}</span>
                <span className="font-display text-xl font-bold tracking-tight text-foreground">{day.title}</span>
              </span>
            </span>
            {isLocked ? (
              <Badge variant="outline" className="text-muted mr-4">
                <Lock className="size-3 mr-1" aria-hidden />
                Locked
              </Badge>
            ) : (
              <span className="mr-4"><CompletionBadge complete={isDayComplete(day.id)} /></span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="px-4 pb-4">
            {isLocked ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-default bg-surface py-8 text-center text-muted">
                <Lock className="size-8 mb-3 opacity-50" aria-hidden />
                <p className="font-bold text-foreground">This day is locked</p>
                <p className="text-sm mt-1 max-w-sm">Complete all lessons in the previous day to unlock this content.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 space-y-2 rounded-xl bg-surface p-4">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-primary">
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
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </section>
  );
}
