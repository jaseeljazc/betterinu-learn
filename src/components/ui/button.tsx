import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-primary border border-transparent hover:translate-y-lift",
  secondary: "btn-secondary border hover:border-focus hover:bg-subtle",
  ghost: "btn-ghost border border-transparent hover:bg-elevated hover:text-foreground",
  danger: "btn-danger border hover:bg-elevated",
  success: "btn-success border border-transparent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-5 text-[13px]",
  lg: "h-11 px-6 text-[13px]",
  icon: "size-9 rounded-md p-0",
};

export function buttonClasses({ variant = "primary", size = "md", className = "" }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-smooth focus-ring active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}
