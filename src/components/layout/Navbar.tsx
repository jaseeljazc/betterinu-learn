"use client";

import Link from "next/link";
import {
  Flame,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  UserRound,
  LogOut,
} from "lucide-react";
import { useProgress } from "@/lib/hooks/useProgress";
import { clientAuth } from "@/lib/firebase-client";

export function Navbar() {
  async function handleSignOut() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[64px] border-b border-default bg-white/98 backdrop-blur-xl">
      <nav
        className="mx-auto relative flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center focus-ring rounded group h-9"
        >
          <img
            src="/new-logo.svg"
            alt="Betterinu Logo"
            className="h-full w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Absolute Center Navigation */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-8 font-medium text-[13px] text-secondary">
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          {/* <Link
            href="/dashboard"
            className="transition-colors hover:text-primary"
          >
            Dashboard
          </Link> */}
          <Link href="/about" className="transition-colors hover:text-primary">
            About
          </Link>
          <Link
            href="/support"
            className="transition-colors hover:text-primary"
          >
            Support
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-sm border border-default bg-white py-1.5 pl-2 pr-3.5 text-xs font-bold text-foreground transition-all hover:bg-subtle focus-ring"
            aria-label="Sign out"
          >
            <span className="grid size-6 place-items-center rounded-sm bg-subtle">
              <LogOut className="size-3.5 text-muted" aria-hidden />
            </span>
            <span className="hidden sm:inline text-muted">Sign out</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
