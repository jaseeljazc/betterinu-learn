"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="group flex items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-primary focus-ring rounded mb-6"
    >
      <span className="flex size-8 items-center justify-center rounded-full border border-default bg-white shadow-sm transition-all group-hover:border-primary group-hover:bg-primary/5">
        <ChevronLeft className="size-4" />
      </span>
      <span>Go Back</span>
    </button>
  );
}
