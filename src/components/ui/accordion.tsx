"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("border-b border-muted last:border-b-0", className)}>
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left focus-ring"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-smooth", open && "rotate-180")} aria-hidden />
      </button>
      {open ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}
