import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { LearnClient } from "@/components/learn/LearnClient";
import { getCourse } from "@/lib/data/courses";

export default async function CourseLearnPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = getCourse(courseId);

  if (!course) {
    notFound();
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <LearnClient course={course} />
      </div>
    </PageWrapper>
  );
}
