"use client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function SupportPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-4 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Support</h1>
      <p className="mt-4 text-lg text-secondary">Coming Soon</p>
      <Link href="/" className="mt-8 flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft className="size-4" />
        Back to Home
      </Link>
    </main>
  );
}
