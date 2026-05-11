import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StreakBanner({ streak }: { streak: number }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-full border border-[var(--terra-200)] bg-streak-soft text-streak">
            <Flame className="size-6 animate-xp-pop" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[22px] font-medium">You are on a {streak}-day streak. Keep it up.</h2>
            <p className="text-sm text-secondary">Complete any module today to keep momentum.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {days.map((day, index) => (
            <span className={index < streak ? "rounded-full bg-streak px-3 py-2 text-xs font-semibold text-[var(--text-on-accent)]" : "rounded-full bg-subtle px-3 py-2 text-xs font-semibold text-muted"} key={day}>
              {day}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
