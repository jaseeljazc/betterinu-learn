import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { QuizClient } from "@/components/quiz/QuizClient";
import { getCourse, getWeek } from "@/lib/data/courses";

export default async function QuizPage({ params }: { params: Promise<{ courseId: string; weekId: string }> }) {
  const { courseId, weekId } = await params;
  const course = getCourse(courseId);
  const week = getWeek(courseId, weekId);

  if (!course || !week) {
    notFound();
  }

  return (
    <PageWrapper>
      <QuizClient course={course} week={week} />
    </PageWrapper>
  );
}
