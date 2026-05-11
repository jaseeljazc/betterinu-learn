import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  label,
  variant = "green",
}: {
  value: number;
  className?: string;
  label?: string;
  variant?: "green" | "amber" | "terra";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradients = {
    green: "var(--gradient-prog-green)",
    amber: "var(--gradient-prog-amber)",
    terra: "var(--gradient-prog-terra)",
  };

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={cn("h-1.5 overflow-hidden rounded-full bg-subtle", className)}
      role="progressbar"
    >
      <div
        className="progress-fill h-full rounded-full"
        style={{ "--progress-value": `${clamped}%`, background: gradients[variant] } as CSSProperties}
      />
    </div>
  );
}
