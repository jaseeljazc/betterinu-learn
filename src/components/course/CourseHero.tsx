import type { CSSProperties } from "react";
import { Clock, Gauge, UserRound } from "lucide-react";
import type { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "./EnrollButton";

export function CourseHero({ course }: { course: Course }) {
  return (
    <section className="course-hero rounded-2xl border border-muted px-6 py-12 shadow-sm sm:px-10" style={{ "--course-color": `var(${course.color})` } as CSSProperties}>
      <div className="max-w-3xl">
        <Badge variant="secondary" className="bg-[#1a4031] text-white">Course Track</Badge>
        <h1 className="mt-5 font-display text-[40px] font-medium leading-[1.1] tracking-tight md:text-[52px]">{course.title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-secondary">{course.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Badge>
            <UserRound className="size-3" aria-hidden />
            {course.instructor}
          </Badge>
          <Badge>
            <Gauge className="size-3" aria-hidden />
            {course.level}
          </Badge>
          <Badge>
            <Clock className="size-3" aria-hidden />
            {course.duration}
          </Badge>
        </div>
        <div className="mt-8">
          <EnrollButton courseId={course.id} />
        </div>
      </div>
    </section>
  );
}
