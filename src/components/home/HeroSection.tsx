import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="hero-surface relative overflow-hidden rounded-2xl border border-muted px-6 py-14 shadow-sm sm:px-10 lg:px-14">
      <div className="relative z-10 max-w-3xl">
        <div className="mb-6 flex flex-wrap gap-3">
          {["4 Courses", "30+ Modules", "200+ Students"].map((stat) => (
            <span className="animate-fade-up rounded-full border border-default bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted shadow-xs" key={stat}>
              {stat}
            </span>
          ))}
        </div>
        <h1 className="font-display text-[40px] font-medium leading-[1.08] tracking-tight text-foreground md:text-[52px]">
          Master in-demand skills. <em className="italic text-primary-mid">One week</em> at a time.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-secondary">
          LearnForge turns career skills into focused weekly quests with lessons, quizzes, XP, streaks, and unlockable progress.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a className={buttonClasses({ size: "lg" })} href="#courses">
            Browse Courses
            <ArrowRight className="size-5" aria-hidden />
          </a>
          <Link className={buttonClasses({ variant: "secondary", size: "lg" })} href="/dashboard">
            <LayoutDashboard className="size-5" aria-hidden />
            View Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
