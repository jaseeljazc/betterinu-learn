import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { LessonViewerClient } from "@/components/learn/LessonViewerClient";
import { getSubModule } from "@/lib/data/courses";

export default async function ModuleViewerPage({
  params,
}: {
  params: Promise<{ courseId: string; weekId: string; moduleId: string }>;
}) {
  const { courseId, weekId, moduleId } = await params;
  const match = getSubModule(courseId, moduleId);

  if (!match || match.week.id !== weekId) {
    notFound();
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <LessonViewerClient course={match.course} day={match.day} subModule={match.subModule} week={match.week} />
      </div>
    </PageWrapper>
  );
}
