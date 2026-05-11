"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import type { Course } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export function EnrolledCourseCard({ course }: { course: Course }) {
  const { getCourseProgress } = useProgress();
  const percent = getCourseProgress(course.id);

  return (
    <Card className="course-card p-5 pt-7" style={{ "--course-color": `var(${course.color})` } as CSSProperties}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-[17px] font-medium">{course.title}</h3>
          <p className="mt-1 text-sm text-secondary">Week 1 of {course.weeks.length}</p>
        </div>
        <Link className={buttonClasses({ variant: "secondary", size: "sm" })} href={`/course/${course.id}/learn`}>
          Continue
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-bold uppercase text-muted">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <Progress value={percent} label={`${course.title} progress`} />
      </div>
    </Card>
  );
}
