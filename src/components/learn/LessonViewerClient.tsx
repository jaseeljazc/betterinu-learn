"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { Course, Day, SubModule, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DocViewer } from "./DocViewer";
import { VideoPlayer } from "./VideoPlayer";
import { AssignmentViewer } from "./AssignmentViewer";
import { FileViewer } from "@/components/ui/FileViewer";
import { LessonSectionViewer } from "./LessonSectionViewer";
import BackButton from "@/components/layout/BackButton";

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

  // Check if the current day is locked
  const currentDayIndex = week.days.findIndex(d => d.id === day.id);
  let isCurrentDayLocked = false;
  if (currentDayIndex > 0) {
    const prevDay = week.days[currentDayIndex - 1];
    const prevComplete = prevDay.subModules.every((m) => isSubModuleComplete(m.id));
    if (!prevComplete) {
      isCurrentDayLocked = true;
    }
  }

  if (isCurrentDayLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="size-16 mb-4 text-muted" aria-hidden />
        <h2 className="font-display text-3xl font-bold">Content Locked</h2>
        <p className="text-secondary mt-2 max-w-md">
          You must fully complete all lessons in the previous day before you can access this content.
        </p>
        <Link className={buttonVariants({ className: "mt-6" })} href={`/course/${course.id}/learn`}>
          <ChevronLeft className="size-4 mr-1" aria-hidden />
          Back to Curriculum
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <BackButton />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-secondary">
        <Link className="focus-ring hover:text-primary transition-colors" href={`/course/${course.id}`}>{course.title}</Link>
        <span>/</span>
        <Link className="focus-ring hover:text-primary transition-colors" href={`/course/${course.id}/learn`}>{week.title}</Link>
        <span>/</span>
        <span>{day.label}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{subModule.title}</span>
      </div>

      <div className="mb-4 text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {subModule.title}
        </h1>
      </div>

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <Badge>{completeCount} of {modules.length} sub-modules completed</Badge>
        {complete ? <Badge variant="success"><CheckCircle2 className="size-3" aria-hidden /> Complete</Badge> : null}
      </div>

      <div className="space-y-8">
        {subModule.type === "video" ? (
          <div className="space-y-6">
            <VideoPlayer module={subModule} />
            {subModule.attachedFiles?.length ? (
              <FileViewer files={subModule.attachedFiles} title="Lesson Attachments" />
            ) : null}
          </div>
        ) : subModule.type === "doc" ? (
          <div className="space-y-6">
            {/* New multi-section viewer — falls back to legacy DocViewer */}
            {subModule.sections?.length
              ? <LessonSectionViewer sections={subModule.sections} />
              : <DocViewer content={subModule.content ?? ""} />
            }
            {subModule.attachedFiles?.length ? (
              <FileViewer files={subModule.attachedFiles} title="Lesson Attachments" />
            ) : null}
          </div>
        ) : subModule.type === "mixed" ? (
          <div className="space-y-12">
            {(subModule.blocks || []).map((block, bIdx) => (
              <div key={bIdx} className="space-y-4 animate-in fade-in-50 duration-500">
                <div className="flex items-center justify-center my-4 gap-3">
                  <div className="size-2 rounded-full bg-primary" />
                  <h3 className="font-display text-xl font-bold tracking-tight text-center">{block.title}</h3>
                </div>
                {block.kind === "video" ? (
                  <VideoPlayer 
                    module={{ 
                      ...subModule, 
                      videoUrl: block.videoUrl, 
                      description: block.description 
                    }} 
                  />
                ) : (
                  <DocViewer content={block.content} />
                )}
              </div>
            ))}
            {subModule.attachedFiles?.length ? (
              <FileViewer files={subModule.attachedFiles} title="Lesson Attachments" />
            ) : null}
          </div>
        ) : subModule.type === "quiz" ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-default bg-surface text-center shadow-sm">
            <h2 className="font-display text-2xl font-bold mb-3">{subModule.title}</h2>
            <p className="text-secondary mb-6 max-w-md">Test your knowledge on the concepts covered in this lesson.</p>
            <Link href={`/quiz/${course.id}/${week.id}?moduleId=${subModule.id}`} className={buttonVariants({ variant: "default", size: "lg" })}>
              Start Quiz
            </Link>
          </div>
        ) : subModule.type === "assignment" ? (
          <AssignmentViewer
            module={subModule}
            courseId={course.id}
            weekId={week.id}
            dayId={day.id}
          />
        ) : (
          <div className="p-8 text-center text-secondary border border-dashed rounded-xl">Unknown content type</div>
        )}
      </div>

      {subModule.externalLinks?.length ? (
        <section className="mt-12 rounded-xl border border-default bg-surface p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold tracking-tight mb-4">External Resources</h2>
          <div className="flex flex-wrap gap-3">
            {subModule.externalLinks.map((link) => (
              <a 
                key={link.url}
                href={link.url} 
                rel="noopener noreferrer" 
                target="_blank"
                className="flex items-center gap-2 rounded-full border border-default bg-white px-4 py-2 text-sm font-semibold text-secondary transition-all hover:border-primary hover:text-primary hover:shadow-sm focus-ring" 
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* Symmetric Fixed Traversal Footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-white/95 px-6 py-2.5 backdrop-blur-xl shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-7xl grid grid-cols-3 items-center gap-4">
          
          {/* Left: Previous Button */}
          <div className="justify-self-start">
            {previous ? (
              <Link 
                className={buttonVariants({ variant: "secondary", size: "sm" }) + " gap-2"} 
                href={`/course/${course.id}/learn/${week.id}/${previous.module.id}`}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
            ) : null}
          </div>

          {/* Center: Completion Action */}
          <div className="justify-self-center">
            <Button 
              onClick={() => markSubModuleComplete(subModule.id, day.id, day.subModules.map(m => m.id))} 
              type="button" 
              size="default"
              className="shadow-md gap-2 font-bold min-w-[180px]"
              variant={complete ? "success" : "primary"}
            >
              {complete ? <CheckCircle2 className="size-5" /> : null}
              {complete ? "Completed" : "Mark Complete"}
            </Button>
          </div>

          {/* Right: Next Button */}
          <div className="justify-self-end">
            {next ? (
              (next.day.id !== day.id && !day.subModules.every(m => isSubModuleComplete(m.id))) ? (
                <span 
                  className={buttonVariants({ variant: "secondary", size: "sm" }) + " gap-2 opacity-50 cursor-not-allowed"} 
                  title="Complete current day to unlock next day."
                >
                  <span className="hidden sm:inline">Next Day Locked</span>
                  <Lock className="size-4" />
                </span>
              ) : (
                <Link 
                  className={buttonVariants({ variant: "secondary", size: "sm" }) + " gap-2"} 
                  href={`/course/${course.id}/learn/${week.id}/${next.module.id}`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-4" />
                </Link>
              )
            ) : (
              <Link 
                className={buttonVariants({ variant: "default", size: "sm" }) + " font-bold gap-2 shadow-md"} 
                href={`/quiz/${course.id}/${week.id}`}
              >
                Take Quiz
                <ChevronRight className="size-4" />
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
