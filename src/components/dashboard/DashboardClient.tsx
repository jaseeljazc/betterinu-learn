"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, Flame, BookLock, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { useProgress } from "@/lib/hooks/useProgress";
import { clientAuth } from "@/lib/firebase-client";
import { EnrolledCourseCard } from "./EnrolledCourseCard";
import { AssignmentsList } from "./AssignmentsList";
import { StreakBanner } from "./StreakBanner";
import RoboLoader from "@/components/loading/robo-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Course } from "@/types";
import type { User } from "firebase/auth";

export function DashboardClient() {
  const { progress } = useProgress();
  const [enrolled, setEnrolled] = useState<Course[] | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = clientAuth.onAuthStateChanged((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch("/api/student/courses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEnrolled(d.courses ?? []))
      .catch(() => setEnrolled([]));
  }, []);

  const xpToNextLevel = 500 - (progress.xp % 500);

  async function handleSignOut() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">

      {/* Page Header */}
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Student Portal</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">
            {user?.displayName ? `Welcome, ${user.displayName.split(" ")[0]}` : "Your Dashboard"}
          </h1>
        </div>
        <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
          <LogOut className="size-3.5" />
          Sign Out
        </Button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* XP Card — green accent */}
        <Card className="col-span-2 lg:col-span-1 border-primary bg-primary text-primary-foreground shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-green-200">Total XP</CardTitle>
              <Sparkles className="size-4 text-green-300" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-extrabold">{progress.xp}</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${((progress.xp % 500) / 500) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-green-200">{xpToNextLevel} XP to next level</p>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Streak</CardTitle>
              <Flame className="size-4 text-orange-500" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-extrabold">{progress.streak}</p>
            <p className="mt-1 text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>

        {/* Courses card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enrolled</CardTitle>
              <BookOpenCheck className="size-4 text-primary" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-extrabold">{enrolled?.length ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active courses</p>
          </CardContent>
        </Card>

        {/* Lessons card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Completed</CardTitle>
              <CheckCircle2 className="size-4 text-green-600" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-extrabold">{progress.completedSubModules.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Lessons done</p>
          </CardContent>
        </Card>
      </div>

      {/* Streak Banner */}
      <StreakBanner streak={progress.streak} />

      {/* Main grid */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">

        {/* Courses section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Enrolled Courses</h2>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          {enrolled === null ? (
            <div className="grid gap-4">
              {[1,2,3].map(i => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-3 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : enrolled.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <BookLock className="mb-3 size-10 text-muted-foreground" />
                <h3 className="font-display text-lg font-bold">No courses assigned</h3>
                <p className="mt-1 text-sm text-muted-foreground">Contact your admin to get enrolled in a course.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {enrolled.map((course) => (
                <EnrolledCourseCard course={course} key={course.id} />
              ))}
            </div>
          )}
        </section>

        {/* Assignments Section */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Your Assignments</h2>
          </div>
          <AssignmentsList />
        </section>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Profile card */}
          <Card>
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary">Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(user.displayName || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-sm">{user.displayName || "BetterInU Student"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-sm bg-muted p-2">
                      <p className="font-bold text-sm">{progress.xp}</p>
                      <p className="text-muted-foreground">XP</p>
                    </div>
                    <div className="rounded-sm bg-muted p-2">
                      <p className="font-bold text-sm">{progress.streak}d</p>
                      <p className="text-muted-foreground">Streak</p>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Member since {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>
              ) : (
                <div className="flex justify-center py-6">
                  <RoboLoader size="sm" />
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
