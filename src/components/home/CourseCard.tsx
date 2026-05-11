import type { CSSProperties } from "react";
import Link from "next/link";
import { Code2, Megaphone, Terminal, Users } from "lucide-react";
import type { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const icons = { Code2, Terminal, Users, Megaphone };

export function CourseCard({ course }: { course: Course }) {
  const Icon = icons[course.icon as keyof typeof icons] ?? Code2;

  return (
    <Card className="course-card p-5 pt-7" style={{ "--course-color": `var(${course.color})` } as CSSProperties}>
      <div className="flex items-start gap-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-sm border border-course bg-course-soft text-course">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-medium leading-snug">{course.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{course.tagline}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge>{course.level}</Badge>
        <Badge>{course.duration}</Badge>
        <Badge>{course.totalModules} modules</Badge>
      </div>
      <div className="mt-5 border-t border-muted pt-4">
        <Link className={buttonClasses({ variant: "ghost" })} href={`/course/${course.id}`}>
          View Course
        </Link>
      </div>
    </Card>
  );
}
