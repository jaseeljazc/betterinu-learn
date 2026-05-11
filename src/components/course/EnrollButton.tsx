"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import type { CourseId } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { Button, buttonClasses } from "@/components/ui/button";

export function EnrollButton({ courseId, size = "lg" }: { courseId: CourseId; size?: "md" | "lg" }) {
  const { enrollInCourse, progress } = useProgress();
  const enrolled = progress.enrolledCourses.includes(courseId);

  if (enrolled) {
    return (
      <Link className={buttonClasses({ size })} href={`/course/${courseId}/learn`}>
        Continue Learning
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    );
  }

  return (
    <Button onClick={() => enrollInCourse(courseId)} size={size} type="button">
      <BookOpenCheck className="size-5" aria-hidden />
      Enroll Now
    </Button>
  );
}
