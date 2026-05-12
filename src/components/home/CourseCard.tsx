import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Code2, Megaphone, Terminal, Users } from "lucide-react";
import type { Course } from "@/types";
import { buttonVariants } from "@/components/ui/button";

const icons = { Code2, Terminal, Users, Megaphone };

export function CourseCard({ course }: { course: Course }) {
  const Icon = icons[course.icon as keyof typeof icons] ?? Code2;

  return (
    <div
      className="course-card group relative rounded-2xl border border-default bg-white p-6 shadow-sm"
      style={{ "--course-color": `var(${course.color})` } as CSSProperties}
    >
      {/* Top section */}
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--course-color), color-mix(in srgb, var(--course-color) 75%, black))" }}
        >
          <Icon className="size-6" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug text-foreground">{course.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{course.tagline}</p>
        </div>
      </div>

      {/* Metadata tags */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[course.level, course.duration, `${course.totalModules} modules`].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-default bg-elevated px-3 py-1 text-xs font-semibold text-secondary"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-5 flex items-center justify-between border-t border-default pt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Your course</span>
        <Link
          className={buttonVariants({ size: "sm" })}
          href={`/course/${course.id}`}
          style={{ boxShadow: "0 2px 8px rgba(21,128,61,0.25)" }}
        >
          Start Learning
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
