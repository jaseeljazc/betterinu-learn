import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { QuizClient } from "@/components/quiz/quiz-client";
import { sql } from "@/lib/db";
import type { Course, Week } from "@/types";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; weekId: string }>;
  searchParams: Promise<{ moduleId?: string }>;
}) {
  const { courseId, weekId } = await params;
  const { moduleId } = await searchParams;

  if (!moduleId) {
    notFound();
  }

  const rows = await sql`SELECT * FROM courses WHERE id = ${courseId}`;
  const dbCourse = rows[0];

  if (!dbCourse) {
    notFound();
  }

  const course: Course = {
    id: dbCourse.id as string,
    title: dbCourse.title as string,
    tagline: dbCourse.tagline as string,
    description: dbCourse.description as string,
    instructor: dbCourse.instructor as string,
    instructorBio: dbCourse.instructor_bio as string,
    duration: dbCourse.duration as string,
    totalModules: dbCourse.total_modules as number,
    level: dbCourse.level as any,
    color: dbCourse.color as string,
    icon: dbCourse.icon as string,
    outcomes: (dbCourse.outcomes as string[]) || [],
    weeks: (dbCourse.curriculum as Week[]) || [],
    image: (dbCourse.image as string) || "",
  };

  const week = course.weeks.find((w) => w.id === weekId);
  if (!week) {
    notFound();
  }

  // Find the quiz module to get the quizData
  let quizModule;
  for (const day of week.days) {
    const mod = day.subModules.find((m) => m.id === moduleId);
    if (mod) {
      quizModule = mod;
      break;
    }
  }

  if (!quizModule || quizModule.type !== "quiz" || !quizModule.quizData) {
    notFound();
  }

  return (
    <PageWrapper>
      <QuizClient
        course={course}
        week={week}
        quizData={quizModule.quizData}
        moduleId={moduleId}
        moduleTitle={quizModule.title}
      />
    </PageWrapper>
  );
}
