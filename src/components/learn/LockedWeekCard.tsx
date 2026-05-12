"use client";

import { Lock } from "lucide-react";
import type { Week } from "@/types";
import { notify } from "@/lib/utils";

export function LockedWeekCard({ week, previousWeekNumber }: { week: Week; previousWeekNumber: number }) {
  return (
    <button
      aria-disabled="true"
      className="group relative w-full cursor-default overflow-hidden rounded-lg border border-dashed border-default bg-white/70 p-5 text-left transition-all hover:border-strong"
      onClick={() => notify(`Complete Week ${previousWeekNumber} first.`)}
      type="button"
    >
      <div className="flex items-center gap-4 opacity-40 blur-[1.5px] transition-all group-hover:blur-[0.5px]">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-subtle text-muted">
          <Lock className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-base font-bold text-foreground">{week.title}</h3>
          <p className="mt-0.5 text-xs text-secondary">Complete Week {previousWeekNumber} to unlock</p>
        </div>
      </div>

      <span className="absolute inset-0 grid place-items-center">
        <span className="inline-flex items-center gap-2 rounded-sm border border-default bg-white/90 px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
          <Lock className="size-3.5 animate-lock-pulse" aria-hidden />
          Locked
        </span>
      </span>
    </button>
  );
}
