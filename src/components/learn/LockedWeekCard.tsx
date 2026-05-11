"use client";

import { Lock } from "lucide-react";
import type { Week } from "@/types";
import { notify } from "@/lib/utils";

export function LockedWeekCard({ week, previousWeekNumber }: { week: Week; previousWeekNumber: number }) {
  return (
    <button
      aria-disabled="true"
      className="locked-card relative w-full cursor-default overflow-hidden rounded-lg p-5 text-left focus-ring"
      onClick={() => notify(`Finish Week ${previousWeekNumber} first.`)}
      type="button"
    >
      <div className="flex items-center gap-4 blur-[1.5px]">
        <span className="grid size-11 place-items-center rounded-full border border-[var(--amber-200)] bg-xp-soft text-[var(--amber-600)]">
          <Lock className="size-5 animate-lock-pulse" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-xl font-bold">{week.title}</h3>
          <p className="mt-1 text-sm text-secondary">Complete Week {previousWeekNumber} to unlock</p>
          <p className="mt-2 text-xs uppercase text-muted">Estimated unlock: after your next study sprint</p>
        </div>
      </div>
      <span className="absolute inset-0 grid place-items-center bg-[rgba(247,245,240,0.5)] backdrop-blur-[1.5px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--amber-200)] bg-xp-soft px-3.5 py-1.5 text-[13px] font-semibold text-[var(--amber-600)]">
          <Lock className="size-4 animate-lock-pulse" aria-hidden />
          Complete previous week
        </span>
      </span>
    </button>
  );
}
