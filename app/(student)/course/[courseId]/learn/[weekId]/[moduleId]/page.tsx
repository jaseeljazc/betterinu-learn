import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { LessonViewerClient } from "@/components/learn/LessonViewerClient";
import { sql } from "@/lib/db";
import type { Course } from "@/types";

export default async function ModuleViewerPage({
  params,
}: {
  params: Promise<{ courseId: string; weekId: string; moduleId: string }>;
}) {
  const { courseId, weekId, moduleId } = await params;
  
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
  };

  // Find the specific module
  let match: any = null;
  for (const week of course.weeks) {
    for (const day of week.days) {
      const subModule = day.subModules.find((item: any) => item.id === moduleId);
      if (subModule) {
        match = { week, day, subModule };
        break;
      }
    }
    if (match) break;
  }

  if (!match || match.week.id !== weekId) {
    notFound();
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <LessonViewerClient course={course} day={match.day} subModule={match.subModule} week={match.week} />
      </div>
    </PageWrapper>
  );
}
