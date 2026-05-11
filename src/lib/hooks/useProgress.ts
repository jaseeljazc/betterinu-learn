"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { courses, getCourse } from "@/lib/data/courses";
import type { CourseId, QuizResult, StudentProgress } from "@/types";
import { notify, todayKey } from "@/lib/utils";

const storageKey = "learnforge-progress";

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

export function useProgress() {
  const [progress, setProgress] = useState<StudentProgress>(initialProgress);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setProgress({ ...initialProgress, ...JSON.parse(raw) });
      }
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    }
  }, [isHydrated, progress]);

  const enrollInCourse = useCallback((courseId: CourseId) => {
    setProgress((current) => {
      if (current.enrolledCourses.includes(courseId)) {
        return current;
      }

      notify("Course added to your dashboard.");
      return { ...current, enrolledCourses: [...current.enrolledCourses, courseId] };
    });
  }, []);

  const markSubModuleComplete = useCallback((subModuleId: string) => {
    setProgress((current) => {
      if (current.completedSubModules.includes(subModuleId)) {
        return current;
      }

      let next = updateStreak({
        ...current,
        completedSubModules: [...current.completedSubModules, subModuleId],
        xp: current.xp + 10,
      });

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
              notify("Day complete. +25 XP");
            }
          }
        }
      }

      notify("Sub-module completed. +10 XP");
      return next;
    });
  }, []);

  const markDayComplete = useCallback((dayId: string) => {
    setProgress((current) => {
      if (current.completedDays.includes(dayId)) {
        return current;
      }

      return updateStreak({
        ...current,
        completedDays: [...current.completedDays, dayId],
        xp: current.xp + 25,
      });
    });
  }, []);

  const saveQuizResult = useCallback((result: QuizResult) => {
    setProgress((current) => {
      const badges = result.passed ? unique([...current.badges, "First Quiz"]) : current.badges;
      const completedWeeks = result.passed ? unique([...current.completedWeeks, `${result.courseId}:${result.weekId}`]) : current.completedWeeks;
      const xp = current.xp + (result.passed ? 150 : 30);

      notify(result.passed ? "Quiz passed. Next week unlocked." : "Attempt saved. Review and try again.");
      return updateStreak({
        ...current,
        quizResults: [...current.quizResults, result],
        completedWeeks,
        badges,
        xp,
      });
    });
  }, []);

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
    (courseId: CourseId, weekId: string) => {
      const week = getCourse(courseId)?.weeks.find((item) => item.id === weekId);
      return Boolean(week?.days.every((day) => progress.completedDays.includes(day.id)));
    },
    [progress.completedDays],
  );

  const isWeekUnlocked = useCallback(
    (courseId: CourseId, weekId: string) => {
      const course = getCourse(courseId);
      const index = course?.weeks.findIndex((week) => week.id === weekId) ?? -1;
      if (index <= 0) {
        return true;
      }

      const previousWeek = course?.weeks[index - 1];
      if (!previousWeek) {
        return false;
      }

      return areAllWeekDaysComplete(courseId, previousWeek.id) && hasPassedQuiz(courseId, previousWeek.id);
    },
    [areAllWeekDaysComplete, hasPassedQuiz],
  );

  const getCourseProgress = useCallback(
    (courseId: CourseId) => {
      const course = getCourse(courseId);
      const allSubModules = course?.weeks.flatMap((week) => week.days.flatMap((day) => day.subModules)) ?? [];
      if (!allSubModules.length) {
        return 0;
      }

      const completed = allSubModules.filter((item) => progress.completedSubModules.includes(item.id)).length;
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
