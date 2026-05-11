"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Course, Day, SubModule, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { DocViewer } from "./DocViewer";
import { VideoPlayer } from "./VideoPlayer";

function flatten(week: Week) {
  return week.days.flatMap((day) => day.subModules.map((module) => ({ day, module })));
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
  const completeCount = modules.filter((item) => isSubModuleComplete(item.module.id)).length;
  const complete = isSubModuleComplete(subModule.id);

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-secondary">
        <Link className="focus-ring" href={`/course/${course.id}`}>{course.title}</Link>
        <span>/</span>
        <Link className="focus-ring" href={`/course/${course.id}/learn`}>{week.title}</Link>
        <span>/</span>
        <span>{day.label}</span>
        <span>/</span>
        <span className="text-foreground">{subModule.title}</span>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Badge>{completeCount} of {modules.length} sub-modules completed</Badge>
        {complete ? <Badge variant="success"><CheckCircle2 className="size-3" aria-hidden /> Complete</Badge> : null}
      </div>

      {subModule.type === "video" ? <VideoPlayer module={subModule} /> : <DocViewer content={subModule.content ?? { sections: [] }} />}

      {subModule.externalLinks?.length ? (
        <section className="mt-8 rounded-xl border border-default bg-surface p-5">
          <h2 className="font-display text-xl font-bold">External Resources</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {subModule.externalLinks.map((link) => (
              <a className="rounded-full border border-default bg-elevated px-3 py-2 text-sm font-bold text-secondary hover:text-foreground focus-ring" href={link.url} key={link.url} rel="noopener" target="_blank">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        {previous ? (
          <Link className={buttonClasses({ variant: "secondary" })} href={`/course/${course.id}/learn/${week.id}/${previous.module.id}`}>
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Link>
        ) : <span />}
        {next ? (
          <Link className={buttonClasses({ variant: "secondary" })} href={`/course/${course.id}/learn/${week.id}/${next.module.id}`}>
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : <Link className={buttonClasses()} href={`/quiz/${course.id}/${week.id}`}>Take Quiz</Link>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-surface/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="hidden text-sm text-secondary sm:block">{subModule.title}</p>
          <Button onClick={() => markSubModuleComplete(subModule.id)} type="button" variant={complete ? "success" : "primary"}>
            {complete ? <CheckCircle2 className="size-4" aria-hidden /> : null}
            {complete ? "Completed" : "Mark as Complete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
