"use client";

import { useMemo } from "react";
import { useProgress } from "./useProgress";

export function useStreak() {
  const { progress } = useProgress();

  return useMemo(
    () => ({
      streak: progress.streak,
      lastStudiedDate: progress.lastStudiedDate,
      weeklyActivity: Array.from({ length: 7 }, (_, index) => index < Math.min(progress.streak, 7)),
    }),
    [progress.lastStudiedDate, progress.streak],
  );
}
