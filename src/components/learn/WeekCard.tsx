"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import type { CourseId, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleAccordion } from "./ModuleAccordion";

export function WeekCard({ courseId, week }: { courseId: CourseId; week: Week }) {
  const { areAllWeekDaysComplete, hasPassedQuiz, isSubModuleComplete } = useProgress();
  const allSubModules = week.days.flatMap((day) => day.subModules);
  const complete = allSubModules.filter((module) => isSubModuleComplete(module.id)).length;
  const percent = allSubModules.length ? Math.round((complete / allSubModules.length) * 100) : 0;
  const daysComplete = areAllWeekDaysComplete(courseId, week.id);
  const passed = hasPassedQuiz(courseId, week.id);

  return (
    <section className="space-y-4" id={week.id}>
      {/* Week Header */}
      <Card className={passed ? "border-green-200" : ""}>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {week.isShared && (
                  <Badge variant="outline" className="gap-1">
                    <Zap className="size-3" aria-hidden />
                    Shared
                  </Badge>
                )}
                {passed && (
                  <Badge className="gap-1 bg-primary text-white hover:bg-primary/90">
                    <CheckCircle2 className="size-3" />
                    Quiz Passed
                  </Badge>
                )}
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                {week.title.replace(":", " —")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {complete} of {allSubModules.length} lessons complete
              </p>
            </div>

            {/* Inline progress */}
            <div className="w-full md:w-52 shrink-0">
              <div className="flex items-center justify-between mb-1.5 text-xs font-semibold">
                <span className="text-muted-foreground">Progress</span>
                <span className={percent === 100 ? "text-green-600" : ""}>{percent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${percent}%`, background: "var(--color-primary)" }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <Accordion type="multiple" defaultValue={!week.days[0] || (week.days.length > 1 && !week.days[0].subModules.every(m => isSubModuleComplete(m.id))) ? [] : [week.days[0].id]} className="grid gap-3 w-full">
        {week.days.map((day, idx) => {
          const isLocked = idx > 0 && !week.days[idx - 1].subModules.every((m) => isSubModuleComplete(m.id));
          return (
            <ModuleAccordion
              courseId={courseId}
              day={day}
              key={day.id}
              weekId={week.id}
              isLocked={isLocked}
            />
          );
        })}
      </Accordion>

      {/* Quiz CTA */}
      {daysComplete && (
        <Card className="border-primary bg-primary text-primary-foreground shadow-md">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg font-bold">Week complete! 🎉</p>
                <p className="mt-0.5 text-sm text-green-200">Pass the quiz to unlock the next week and earn 150 XP.</p>
              </div>
              <Button asChild variant="secondary" className="shrink-0 gap-2 font-bold">
                <Link href={`/quiz/${courseId}/${week.id}`}>
                  Take Quiz
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
