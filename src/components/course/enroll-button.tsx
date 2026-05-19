"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import type { CourseId } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Button, buttonVariants } from "@/components/ui/button";

export function EnrollButton({ courseId, size = "lg", className }: { courseId: CourseId; size?: "md" | "lg"; className?: string }) {
  const { enrollInCourse, progress } = useProgress();
  const enrolled = progress.enrolledCourses.includes(courseId);

  const buttonSize = size === "md" ? "default" : "lg";

  if (enrolled) {
    return (
      <Link className={buttonVariants({ size: buttonSize, className: cn(" text-white", className) })} href={`/course/${courseId}/learn`}>
        Continue Learning
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    );
  }

  return (
    <Button onClick={() => enrollInCourse(courseId)} size={buttonSize} type="button" className={cn("w-full", className)}>
      <BookOpenCheck className="size-5" aria-hidden />
      Enroll Now
    </Button>
  );
}
