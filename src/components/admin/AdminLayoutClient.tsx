"use client";

import { useState, useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { clientAuth } from "@/lib/firebase-client";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Silently refresh the __session cookie whenever Firebase auto-rotates the ID token.
    // Firebase rotates tokens every ~55 minutes; without this the cookie would hold
    // an expired token even though the cookie itself is still alive.
    const unsubscribeToken = onIdTokenChanged(clientAuth, async (user) => {
      if (user) {
        const freshToken = await user.getIdToken();
        document.cookie = `__session=${freshToken}; path=/; max-age=604800; SameSite=Lax`;
      } else {
        // Signed out — clear the session cookie.
        document.cookie = `__session=; path=/; max-age=0; SameSite=Lax`;
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
