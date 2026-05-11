"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ToastHost() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const listener = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
      window.setTimeout(() => setMessage(""), 2600);
    };

    window.addEventListener("learnforge-toast", listener);
    return () => window.removeEventListener("learnforge-toast", listener);
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-md bg-[var(--green-900)] px-4 py-3 text-[13px] font-semibold text-on-dark shadow-lg animate-slide-in-right">
      <CheckCircle2 className="size-5 text-[var(--green-200)]" aria-hidden />
      {message}
    </div>
  );
}
