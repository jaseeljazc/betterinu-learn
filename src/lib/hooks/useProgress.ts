"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { courses, getCourse } from "@/lib/data/courses";
import type { Course, CourseId, QuizResult, StudentProgress } from "@/types";
import { notify, todayKey } from "@/lib/utils";

const storageKey = "betterinu-progress";

const initialProgress: StudentProgress = {
  enrolledCourses: [],
  completedSubModules: [],
  completedDays: [],
  completedWeeks: [],
  quizResults: [],
  xp: 0,
  streak: 0,
  lastStudiedDate: "",
  badges: [],
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function updateStreak(progress: StudentProgress): StudentProgress {
  const today = todayKey();
  if (progress.lastStudiedDate === today) {
    return progress;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const wasYesterday = progress.lastStudiedDate === todayKey(yesterday);

  return {
    ...progress,
    streak: wasYesterday ? progress.streak + 1 : 1,
    lastStudiedDate: today,
  };
}

let globalSyncPromise: Promise<any> | null = null;

export function useProgress() {
  const [progress, setProgress] = useState<StudentProgress>(initialProgress);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Fast local hydration
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        setProgress({ ...initialProgress, ...JSON.parse(raw) });
      } catch (e) {}
    }
    setIsHydrated(true);

    // Fetch from database to ensure cross-device sync
    if (!globalSyncPromise) {
      globalSyncPromise = fetch("/api/student/progress-sync", { credentials: "include" })
        .then(res => res.json())
        .catch(err => {
          console.error("Failed to sync progress from db", err);
          return null;
        });
    }

    globalSyncPromise.then(data => {
      if (mounted && data?.progress) {
        const merged = { ...initialProgress, ...data.progress };
        setProgress(merged);
        window.localStorage.setItem(storageKey, JSON.stringify(merged));
      }
    });

    const handleSync = (e: any) => {
      if (e.detail && mounted) {
        setProgress(e.detail);
      }
    };
    window.addEventListener("betterinu-progress-sync", handleSync);
    
    return () => {
      mounted = false;
      window.removeEventListener("betterinu-progress-sync", handleSync);
    };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
      window.dispatchEvent(new CustomEvent("betterinu-progress-sync", { detail: progress }));
    }
  }, [isHydrated, progress]);

  const syncToDb = useCallback((newProgress: StudentProgress) => {
    fetch("/api/student/progress-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: newProgress }),
      credentials: "include"
    }).catch(err => console.error("Failed to save progress to db", err));
  }, []);

  const enrollInCourse = useCallback((courseId: CourseId) => {
    let shouldNotify = false;
    setProgress((current) => {
      if (current.enrolledCourses.includes(courseId)) {
        return current;
      }
      shouldNotify = true;
      const next = { ...current, enrolledCourses: [...current.enrolledCourses, courseId] };
      syncToDb(next);
      return next;
    });
    if (shouldNotify) {
      notify("Course added to your dashboard.");
    }
  }, [syncToDb]);

  const markSubModuleComplete = useCallback((subModuleId: string, dayId?: string, daySubModulesIds?: string[]) => {
    let notifications: string[] = [];
    setProgress((current) => {
      if (current.completedSubModules.includes(subModuleId)) {
        return current;
      }

      let next = updateStreak({
        ...current,
        completedSubModules: [...current.completedSubModules, subModuleId],
        xp: current.xp + 10,
      });
      notifications.push("Lesson completed. +10 XP");

      if (dayId && daySubModulesIds) {
        const allDone = daySubModulesIds.every((id) => next.completedSubModules.includes(id));
        if (allDone && !next.completedDays.includes(dayId)) {
          next = {
            ...next,
            completedDays: [...next.completedDays, dayId],
            xp: next.xp + 25,
          };
          notifications.push("Day complete. +25 XP");
        }
      } else {
        // Fallback for hardcoded courses if day info not provided
        for (const course of courses) {
          for (const week of course.weeks) {
            for (const day of week.days) {
              const belongsToDay = day.subModules.some((item) => item.id === subModuleId);
              const allDone = day.subModules.every((item) => next.completedSubModules.includes(item.id));
              if (belongsToDay && allDone && !next.completedDays.includes(day.id)) {
                next = {
                  ...next,
                  completedDays: [...next.completedDays, day.id],
                  xp: next.xp + 25,
                };
                notifications.push("Day complete. +25 XP");
              }
            }
          }
        }
      }

      syncToDb(next);
      return next;
    });
    notifications.forEach(msg => notify(msg));
  }, [syncToDb]);

  const markDayComplete = useCallback((dayId: string) => {
    setProgress((current) => {
      if (current.completedDays.includes(dayId)) {
        return current;
      }

      const next = updateStreak({
        ...current,
        completedDays: [...current.completedDays, dayId],
        xp: current.xp + 25,
      });
      syncToDb(next);
      return next;
    });
  }, [syncToDb]);

  const saveQuizResult = useCallback((result: QuizResult) => {
    setProgress((current) => {
      const badges = result.passed ? unique([...current.badges, "First Quiz"]) : current.badges;
      const completedWeeks = result.passed ? unique([...current.completedWeeks, `${result.courseId}:${result.weekId}`]) : current.completedWeeks;
      const xp = current.xp + (result.passed ? 150 : 30);

      const next = updateStreak({
        ...current,
        quizResults: [...current.quizResults, result],
        completedWeeks,
        badges,
        xp,
      });
      syncToDb(next);
      return next;
    });
    notify(result.passed ? "Quiz passed. Next week unlocked." : "Attempt saved. Review and try again.");
  }, [syncToDb]);

  const isSubModuleComplete = useCallback(
    (id: string) => progress.completedSubModules.includes(id),
    [progress.completedSubModules],
  );

  const isDayComplete = useCallback((id: string) => progress.completedDays.includes(id), [progress.completedDays]);

  const isWeekComplete = useCallback(
    (courseId: CourseId, weekId: string) => progress.completedWeeks.includes(`${courseId}:${weekId}`),
    [progress.completedWeeks],
  );

  const hasPassedQuiz = useCallback(
    (courseId: CourseId, weekId: string) =>
      progress.quizResults.some((result) => result.courseId === courseId && result.weekId === weekId && result.passed),
    [progress.quizResults],
  );

  const areAllWeekDaysComplete = useCallback(
    (courseOrId: Course | string, weekId: string) => {
      const course = typeof courseOrId === "string" ? getCourse(courseOrId) : courseOrId;
      if (!course) return false;
      const week = course.weeks.find((item: any) => item.id === weekId);
      if (!week || !week.days || week.days.length === 0) return false;
      return Boolean(week.days.every((day: any) => progress.completedDays.includes(day.id)));
    },
    [progress.completedDays],
  );

  const isWeekUnlocked = useCallback(
    (courseOrId: Course | string, weekId: string) => {
      const course = typeof courseOrId === "string" ? getCourse(courseOrId) : courseOrId;
      if (!course) return false;
      const index = course.weeks.findIndex((week: any) => week.id === weekId);
      if (index <= 0) {
        return true;
      }

      const previousWeek = course.weeks[index - 1];
      if (!previousWeek) {
        return false;
      }

      const requiresQuiz = previousWeek.quiz && previousWeek.quiz.questions && previousWeek.quiz.questions.length > 0;
      const passedQuiz = requiresQuiz ? hasPassedQuiz(course.id, previousWeek.id) : true;

      return areAllWeekDaysComplete(course, previousWeek.id) && passedQuiz;
    },
    [areAllWeekDaysComplete, hasPassedQuiz],
  );

  const getCourseProgress = useCallback(
    (courseOrId: Course | string) => {
      const course = typeof courseOrId === "string" ? getCourse(courseOrId) : courseOrId;
      if (!course) return 0;
      const allSubModules = course.weeks.flatMap((week: any) => week.days.flatMap((day: any) => day.subModules)) ?? [];
      if (!allSubModules.length) {
        return 0;
      }

      const completed = allSubModules.filter((item: any) => progress.completedSubModules.includes(item.id)).length;
      return Math.round((completed / allSubModules.length) * 100);
    },
    [progress.completedSubModules],
  );

  const getTotalXP = useCallback(() => progress.xp, [progress.xp]);
  const getStreak = useCallback(() => progress.streak, [progress.streak]);

  return useMemo(
    () => ({
      progress,
      enrollInCourse,
      markSubModuleComplete,
      markDayComplete,
      saveQuizResult,
      isSubModuleComplete,
      isDayComplete,
      isWeekComplete,
      isWeekUnlocked,
      areAllWeekDaysComplete,
      hasPassedQuiz,
      getCourseProgress,
      getTotalXP,
      getStreak,
    }),
    [
      progress,
      enrollInCourse,
      markSubModuleComplete,
      markDayComplete,
      saveQuizResult,
      isSubModuleComplete,
      isDayComplete,
      isWeekComplete,
      isWeekUnlocked,
      areAllWeekDaysComplete,
      hasPassedQuiz,
      getCourseProgress,
      getTotalXP,
      getStreak,
    ],
  );
}
