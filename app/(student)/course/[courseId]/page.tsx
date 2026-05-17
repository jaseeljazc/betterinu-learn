import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, BarChart3, Clock, UserRound, ChevronRight } from "lucide-react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { CourseHero } from "@/components/course/course-hero";
import { SyllabusList } from "@/components/course/syllabus-list";
import { EnrollButton } from "@/components/course/enroll-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sql } from "@/lib/db";
import type { Course } from "@/types";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const rows = await sql`SELECT * FROM courses WHERE id = ${courseId}`;
  const dbCourse = rows[0];

  if (!dbCourse) {
    notFound();
  }

  // Map DB fields to Course type
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
    image: dbCourse.image as string,
  };

  const stats = [
    { Icon: Clock, label: "Duration", value: course.duration },
    { Icon: BarChart3, label: "Modules", value: `${course.totalModules}` },
    { Icon: Award, label: "Certificate", value: "Included" },
    { Icon: UserRound, label: "Level", value: course.level },
  ];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl space-y-6 pt-2">
        <nav
          className="flex items-center gap-2 text-xs font-semibold text-muted mb-2"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="opacity-50" />
          <span className="text-foreground">{course.title}</span>
        </nav>

        <CourseHero course={course} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase text-muted">
                Syllabus preview
              </p>
              <h2 className="font-display text-3xl font-bold">
                Weekly Curriculum
              </h2>
            </div>
            <SyllabusList course={course} />
          </section>
          <aside className="relative">
            {/* Invisible spacer to perfectly align the card with the Syllabus accordion */}
            <div className="mb-4 hidden lg:block invisible" aria-hidden="true">
              <p className="text-sm font-bold uppercase text-muted">Spacer</p>
              <h2 className="font-display text-3xl font-bold">Spacer</h2>
            </div>

            <div className="space-y-5 lg:sticky lg:top-24">
              <Card className="p-5">
                <h2 className="font-display text-xl font-bold">Course Stats</h2>
                <div className="mt-4 grid gap-3">
                  {stats.map(({ Icon, label, value }) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg bg-subtle p-3"
                      key={label}
                    >
                      <span className="flex items-center gap-2 text-sm text-secondary">
                        <Icon className="size-4 text-primary" aria-hidden />
                        {label}
                      </span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              {/* <Card className="p-5">
                <h2 className="font-display text-xl font-bold">Instructor</h2>
                <div className="mt- flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full bg-elevated font-bold">
                    {course.instructor[0]}
                  </span>
                  <div>
                    <p className="font-bold">{course.instructor}</p>
                    <p className="text-sm text-secondary">
                      {course.instructorBio}
                    </p>
                  </div>
                </div>
              </Card> */}
              <EnrollButton courseId={course.id} className="w-full" />
            </div>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}
