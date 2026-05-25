"use client";

import { useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { clientAuth } from "@/lib/firebase-client";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Refresh the httpOnly __session cookie whenever Firebase auto-rotates the ID token.
    // Firebase rotates tokens every ~55 minutes. Without this the cookie would hold
    // an expired token even though Firebase still considers the user signed in.
    const unsubscribeToken = onIdTokenChanged(clientAuth, async (user) => {
      if (user) {
        try {
          const freshToken = await user.getIdToken();
          await fetch("/api/auth/refresh-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken }),
          });
        } catch {
          // Network error — non-fatal, will retry on next rotation
        }
      } else {
        // Signed out — clear the session cookie on the server.
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      }
    });

    // Sidebar collapsed state
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }

    // Auto-collapse on mobile
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      } else if (saved !== "true") {
        setCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      unsubscribeToken();
    };
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin-sidebar-collapsed", String(next));
  }

  return (
    <div className={`min-h-screen bg-subtle transition-all duration-300 ${collapsed ? "pl-16" : "pl-60"}`}>
      <AdminSidebar collapsed={collapsed} onToggle={toggle} isMobile={isMobile} />
      <main className="min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
