import type { ReactNode } from "react";

export function PageWrapper({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-4 pb-16 pt-[72px] text-foreground sm:px-6 lg:px-8">{children}</main>;
}
