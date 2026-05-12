"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Course } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function EnrolledCourseCard({ course }: { course: Course }) {
  const { getCourseProgress } = useProgress();
  const percent = getCourseProgress(course);

  return (
    <Card
      className="course-card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ "--course-color": `var(${course.color})` } as CSSProperties}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {course.level && (
              <Badge variant="secondary" className="mb-1.5 text-[10px] uppercase tracking-wider">
                {course.level}
              </Badge>
            )}
            <h3 className="font-display text-base font-bold leading-snug">{course.title}</h3>
            {course.tagline && <p className="mt-0.5 text-xs text-muted-foreground">{course.tagline}</p>}
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
            <Link href={`/course/${course.id}/learn`}>
              Continue
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wide">Progress</span>
            <span className={percent === 100 ? "text-green-600" : "text-foreground"}>{percent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percent}%`, background: "var(--green-700)" }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{course.weeks.length} weeks</p>
            {percent === 100 && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <CheckCircle2 className="size-3.5" /> Complete
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
