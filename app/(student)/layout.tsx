/**
 * (student)/layout.tsx
 * Wraps all student-facing pages with the existing Navbar and toast system.
 * This layout is NOT applied to admin routes.
 */
import { Navbar } from "@/components/layout/Navbar";
import { ToastHost } from "@/components/ui/toast";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-0 h-full w-full bg-[#f8fafc]" />
      <Navbar />
      <div className="relative z-10">
        {children}
      </div>
      <ToastHost />
    </>
  );
}
