"use client";

import Link from "next/link";
import { Flame, GraduationCap, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { courses } from "@/lib/data/courses";
import { useProgress } from "@/lib/hooks/useProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { getStreak, getTotalXP } = useProgress();

  const links = courses.map((course) => (
    <Link
      className="rounded-sm px-3 py-1.5 text-[13px] font-medium text-muted transition-smooth hover:bg-elevated hover:text-foreground focus-ring"
      href={`/course/${course.id}`}
      key={course.id}
      onClick={() => setOpen(false)}
    >
      {course.title.split(" ")[0]}
    </Link>
  ));

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[60px] border-b border-default bg-surface shadow-sm">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <Link href="/" className="flex items-center gap-2 rounded-sm font-display text-lg font-bold text-primary focus-ring">
          <span className="grid size-8 place-items-center rounded-full bg-primary-light text-primary">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          LearnForge
          <span className="size-2 rounded-full bg-primary-mid" aria-hidden />
        </Link>

        <div className="hidden items-center gap-2 md:flex">{links}</div>

        <div className="hidden items-center gap-3 md:flex">
          <Badge variant="xp">
            <Sparkles className="size-3" aria-hidden />
            {getTotalXP()} XP
          </Badge>
          <Badge variant="streak">
            <Flame className="size-3" aria-hidden />
            {getStreak()} day
          </Badge>
          <Link className="grid size-[30px] place-items-center rounded-full border border-[var(--green-200)] bg-primary-light text-[11px] font-semibold text-primary focus-ring" href="/dashboard" aria-label="Open dashboard">
            LF
          </Link>
        </div>

        <Button aria-label="Open navigation menu" className="md:hidden" onClick={() => setOpen(true)} size="icon" type="button" variant="ghost">
          <Menu className="size-5" aria-hidden />
        </Button>
      </nav>

      {open ? (
        <div className="fixed inset-0 top-16 z-50 bg-overlay md:hidden">
          <aside className="ml-auto h-full w-80 max-w-[85vw] border-l border-default bg-surface p-4 shadow-modal">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <Button aria-label="Close navigation menu" onClick={() => setOpen(false)} size="icon" type="button" variant="ghost">
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <div className="grid gap-2">{links}</div>
            <Link className="mt-4 inline-flex rounded-sm px-3 py-2 text-[13px] font-semibold text-primary focus-ring" href="/dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
