import { notFound } from "next/navigation";
import { Award, BarChart3, Clock, UserRound } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CourseHero } from "@/components/course/CourseHero";
import { SyllabusList } from "@/components/course/SyllabusList";
import { EnrollButton } from "@/components/course/EnrollButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCourse } from "@/lib/data/courses";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = getCourse(courseId);

  if (!course) {
    notFound();
  }

  const stats = [
    { Icon: Clock, label: "Duration", value: course.duration },
    { Icon: BarChart3, label: "Modules", value: `${course.totalModules}` },
    { Icon: Award, label: "Certificate", value: "Included" },
    { Icon: UserRound, label: "Level", value: course.level },
  ];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl space-y-10">
        <CourseHero course={course} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase text-muted">Syllabus preview</p>
              <h2 className="font-display text-3xl font-bold">Weekly Curriculum</h2>
            </div>
            <SyllabusList course={course} />
          </section>
          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <Card className="p-5">
              <h2 className="font-display text-xl font-bold">Course Stats</h2>
              <div className="mt-4 grid gap-3">
                {stats.map(({ Icon, label, value }) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-subtle p-3" key={label}>
                    <span className="flex items-center gap-2 text-sm text-secondary">
                      <Icon className="size-4 text-primary" aria-hidden />
                      {label}
                    </span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-xl font-bold">Instructor</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-elevated font-bold">{course.instructor[0]}</span>
                <div>
                  <p className="font-bold">{course.instructor}</p>
                  <p className="text-sm text-secondary">{course.instructorBio}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-display text-xl font-bold">What You Will Learn</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.outcomes.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
              <div className="mt-5">
                <EnrollButton courseId={course.id} />
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}
