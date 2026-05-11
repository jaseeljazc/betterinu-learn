import { PageWrapper } from "@/components/layout/PageWrapper";
import { HeroSection } from "@/components/home/HeroSection";
import { CourseCard } from "@/components/home/CourseCard";
import { StatsBar } from "@/components/home/StatsBar";
import { courses } from "@/lib/data/courses";

export default function Home() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <HeroSection />
        <section className="mt-12" id="courses">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-muted">Choose your track</p>
              <h2 className="font-display text-3xl font-bold">Course Catalog</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-secondary">Each course is broken into weekly unlocks, daily lessons, and end-of-week quizzes.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </div>
        </section>
        <StatsBar />
      </div>
    </PageWrapper>
  );
}
