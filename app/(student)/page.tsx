"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { HeroSection } from "@/components/home/HeroSection";
import { CourseCard } from "@/components/home/CourseCard";
import { StatsBar } from "@/components/home/StatsBar";
import { BookLock } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import type { Course } from "@/types";

export default function Home() {
  const [assignedCourses, setAssignedCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    fetch("/api/student/courses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAssignedCourses(d.courses ?? []))
      .catch(() => setAssignedCourses([]));
  }, []);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl">
        <HeroSection />
        <section className="mt-12" id="courses">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-muted">Your tracks</p>
              <h2 className="font-display text-3xl font-bold">My Courses</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-secondary">
              These are the courses your admin has enrolled you in. Complete weekly lessons and quizzes to track your progress.
            </p>
          </div>

          {assignedCourses === null ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <RoboLoader size="sm" className="mr-3" />
              <span className="text-sm">Loading your courses...</span>
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-default bg-surface py-16 text-center">
              <BookLock className="size-12 text-muted mb-4" />
              <h3 className="font-display text-xl font-bold">No courses assigned yet</h3>
              <p className="mt-2 text-sm text-secondary max-w-sm">
                Your admin hasn't enrolled you in any courses yet. Please contact them to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {assignedCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          )}
        </section>
        <StatsBar />
      </div>
    </PageWrapper>
  );
}

