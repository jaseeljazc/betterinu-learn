"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
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
    return () => window.removeEventListener("resize", checkMobile);
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
