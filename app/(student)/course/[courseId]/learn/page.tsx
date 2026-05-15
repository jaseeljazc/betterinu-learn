import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { LearnClient } from "@/components/learn/LearnClient";
import { sql } from "@/lib/db";
import type { Course } from "@/types";

export default async function CourseLearnPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  
  const rows = await sql`SELECT * FROM courses WHERE id = ${courseId}`;
  const dbCourse = rows[0];

  if (!dbCourse) {
    notFound();
  }

  // Map to Course
  const course: Course = {
    id: dbCourse.id as string,
    title: dbCourse.title as string,
    tagline: dbCourse.tagline as string,
    description: dbCourse.description as string,
    instructor: dbCourse.instructor as string,
    instructorBio: dbCourse.instructor_bio as string,
    duration: dbCourse.duration as string,
    totalModules: dbCourse.total_modules as number,
    level: dbCourse.level as string,
    color: dbCourse.color as string,
    icon: dbCourse.icon as string,
    outcomes: (dbCourse.outcomes as string[]) || [],
    weeks: (dbCourse.curriculum as any[]) || [],
    image: (dbCourse.image as string) || "",
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <LearnClient course={course} />
      </div>
    </PageWrapper>
  );
}
