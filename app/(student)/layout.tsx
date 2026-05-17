/**
 * (student)/layout.tsx
 * Wraps all student-facing pages with the existing Navbar and toast system.
 * This layout is NOT applied to admin routes.
 */
import { Navbar } from "@/components/layout/main-navbar";
import { ToastHost } from "@/components/ui/toast";
import { StudentTokenRefresher } from "@/components/layout/student-token-refresher";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Keeps the httpOnly __session cookie alive as Firebase rotates ID tokens */}
      <StudentTokenRefresher />
      <div className="fixed inset-0 z-0 h-full w-full bg-[#f8fafc]" />
      <Navbar />
      <div className="relative z-10">
        {children}
      </div>
      <ToastHost />
    </>
  );
}
