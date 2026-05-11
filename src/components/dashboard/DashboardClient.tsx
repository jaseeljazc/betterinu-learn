"use client";

import { BookOpenCheck, CheckCircle2, Flame } from "lucide-react";
import { courses } from "@/lib/data/courses";
import { useProgress } from "@/lib/hooks/useProgress";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { EnrolledCourseCard } from "./EnrolledCourseCard";
import { Leaderboard } from "./Leaderboard";
import { NotificationPanel } from "./NotificationPanel";
import { StreakBanner } from "./StreakBanner";
import { XpProgress } from "./XpProgress";
import Link from "next/link";

export function DashboardClient() {
  const { progress } = useProgress();
  const enrolled = courses.filter((course) => progress.enrolledCourses.includes(course.id));
  const stats = [
    { label: "Current Streak", value: progress.streak, icon: Flame },
    { label: "Courses In Progress", value: enrolled.length, icon: BookOpenCheck },
    { label: "Modules Completed", value: progress.completedSubModules.length, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase text-muted">Student dashboard</p>
        <h1 className="font-display text-4xl font-bold">Your Learning Forge</h1>
      </header>

      <div className="grid gap-5 md:grid-cols-4">
        <XpProgress xp={progress.xp} />
        {stats.map(({ label, value, icon: Icon }) => (
          <Card className="p-5" key={label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-muted">{label}</p>
                <p className="mt-2 font-display text-3xl font-bold">{value}</p>
              </div>
              <Icon className="size-8 text-primary" aria-hidden />
            </div>
          </Card>
        ))}
      </div>

      <StreakBanner streak={progress.streak} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Enrolled Courses</h2>
          {enrolled.length ? (
            <div className="grid gap-4">
              {enrolled.map((course) => (
                <EnrolledCourseCard course={course} key={course.id} />
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold">No courses yet</h3>
              <p className="mt-2 text-secondary">Enroll in a track to start saving progress here.</p>
              <Link className={buttonClasses({ className: "mt-4" })} href="/">
                Browse Courses
              </Link>
            </Card>
          )}
        </section>
        <aside className="space-y-6">
          <Leaderboard />
          <NotificationPanel />
        </aside>
      </div>
    </div>
  );
}
