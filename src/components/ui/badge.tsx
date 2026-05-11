import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "course" | "xp" | "streak" | "success" | "danger" | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "border-default bg-elevated text-muted",
  course: "border-course bg-course-soft text-course",
  xp: "border-[var(--amber-200)] bg-xp-soft text-[var(--amber-600)]",
  streak: "border-[var(--terra-200)] bg-streak-soft text-[var(--terra-600)]",
  success: "border-success bg-success-soft text-success",
  danger: "border-danger bg-danger-soft text-danger",
  muted: "border-default bg-elevated text-muted",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
