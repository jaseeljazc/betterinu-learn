import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, Trophy, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const stats = [
  { icon: BookOpen,  value: "4+",   label: "Courses" },
  { icon: Trophy,    value: "30+",  label: "Modules" },
  { icon: Users,     value: "200+", label: "Students" },
  { icon: Sparkles,  value: "10k+", label: "XP Earned" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-lg border border-default bg-white" style={{ minHeight: "420px" }}>
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      {/* BG gradient splash */}
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full opacity-60" style={{ background: "radial-gradient(circle, rgba(21,128,61,0.09), transparent 65%)", filter: "blur(60px)" }} aria-hidden />

      <div className="relative z-10 px-8 py-14 sm:px-14 lg:px-20">
        {/* Eyebrow */}
        <p className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary animate-fade-up">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          BetterInU Learning Platform
        </p>

        {/* Heading */}
        <h1 className="max-w-3xl font-display text-[46px] font-extrabold leading-[1.04] tracking-tight text-foreground md:text-[62px] animate-fade-up" style={{ animationDelay: "60ms" }}>
          Learn smarter.{" "}
          <span className="text-primary">Grow faster.</span>
        </h1>

        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-secondary animate-fade-up" style={{ animationDelay: "120ms" }}>
          Career-focused weekly courses with structured lessons, live quizzes, XP streaks, and unlockable progress — built for real outcomes.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <a
            className={buttonVariants({ size: "lg" })}
            href="#courses"
            style={{ boxShadow: "0 4px 20px rgba(21,128,61,0.30)" }}
          >
            Browse Courses
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <Link className={buttonVariants({ variant: "secondary", size: "lg" })} href="/dashboard">
            My Dashboard
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-14 grid grid-cols-2 gap-4 border-t border-default pt-8 sm:grid-cols-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary/8 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-secondary">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
