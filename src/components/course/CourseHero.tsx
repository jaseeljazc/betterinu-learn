import type { CSSProperties } from "react";
import Image from "next/image";
import { Clock, UserRound } from "lucide-react";
import type { Course } from "@/types";
import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "./EnrollButton";
import { Card } from "../ui/card";

export function CourseHero({ course }: { course: Course }) {
  return (
    <Card>
      <section
        className="course-hero px-6 py-5 sm:px-10"
        style={{ "--course-color": `var(${course.color})` } as CSSProperties}
      >
        <div className="flex items-center gap-8">
          {/* Left: Text content */}
          <div className="max-w-3xl flex-1">
            <Badge variant="secondary" className="bg-[#1a4031] text-white">Course Track</Badge>
            <h1 className="mt-5 font-display text-[40px] font-medium leading-[1.1] tracking-tight md:text-[52px]">
              {course.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-secondary">
              {course.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Badge className="text-white">
                <UserRound className="size-3" aria-hidden />
                {course.instructor}
              </Badge>
              <Badge className="text-white">
                <Clock className="size-3" aria-hidden />
                {course.duration}
              </Badge>
            </div>
            <div className="mt-8">
              <EnrollButton courseId={course.id} className="text-white" />
            </div>
          </div>

          {/* Right: Thumbnail */}
          {course.image && (
            <div className="hidden lg:block shrink-0">
              <Image
                src={course.image}
                alt={course.title}
                width={384}
                height={256}
                className="h-64 w-96 rounded-2xl object-cover"
              />
            </div>
          )}
        </div>
      </section>
    </Card>
  );
}