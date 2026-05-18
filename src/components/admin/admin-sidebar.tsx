"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UsersRound,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { clientAuth } from "@/lib/firebase-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const FALLBACK_NAV = [
  { href: "/admin/dashboard",             label: "Dashboard",        Icon: LayoutDashboard },
  { href: "/admin/courses",               label: "Courses",           Icon: BookOpen },
  { href: "/admin/students",              label: "Students",          Icon: Users },
  { href: "/admin/submissions",           label: "Submissions",       Icon: ClipboardList },
  { href: "/admin/standalone-assignments",label: "Standalone Tasks",  Icon: GraduationCap },
];

export function AdminSidebar({
  collapsed,
  onToggle,
  isMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, role, can, fullName, email } = useAdminPermissions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nav = mounted
    ? [
        { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
        ...(can("courses", "view") ? [{ href: "/admin/courses", label: "Courses", Icon: BookOpen }] : []),
        ...(can("students", "view") ? [{ href: "/admin/students", label: "Students", Icon: Users }] : []),
        ...(can("tasks", "view") ? [{ href: "/admin/submissions", label: "Submissions", Icon: ClipboardList }] : []),
        ...(can("tasks", "view") ? [{ href: "/admin/standalone-assignments", label: "Standalone Tasks", Icon: GraduationCap }] : []),
        ...(isSuperAdmin
          ? [
              { href: "/admin/admins", label: "Admins", Icon: UsersRound },
              { href: "/admin/roles", label: "Roles & Permissions", Icon: ShieldCheck },
            ]
          : []),
      ]
    : FALLBACK_NAV;

  async function handleLogout() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    router.push("/admin/login");
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-default bg-white transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
      >
        {/* Header */}
        <div
          className={`flex h-16 items-center border-b border-default ${collapsed ? "justify-center px-0" : "px-5 gap-3"}`}
        >
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex items-center h-8">
              <Image
                src="/new-logo.svg"
                alt="Betterinu Logo"
                width={100}
                height={32}
                unoptimized
                className="h-full w-auto object-contain"
              />
            </Link>
          )}
          {!collapsed && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Admin
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
          {nav.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            const content = (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center rounded-lg transition-colors",
                  collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-secondary font-medium hover:bg-subtle hover:text-primary",
                ].join(" ")}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span className="text-sm">{label}</span>}
              </Link>
            );

            if (!collapsed) return content;

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div
          className={`border-t border-default py-4 space-y-2 ${collapsed ? "px-2" : "px-3"}`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className={`flex w-full items-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5 text-sm font-medium"}`}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-5" />
                ) : (
                  <PanelLeftClose className="size-5 shrink-0" />
                )}
                {!collapsed && <span>Collapse Sidebar</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            )}
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex w-full items-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5 text-sm font-medium"}`}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                    <span className="truncate w-full font-semibold text-foreground">
                      {mounted ? (fullName || "Admin") : ""}
                    </span>
                    <span className="truncate w-full text-[11px] text-muted">
                      {mounted ? (email || "Loading...") : ""}
                    </span>
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-60 p-5 rounded-2xl">
              <div className="flex flex-col items-center gap-3 text-center mb-5">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-7" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base leading-tight">{mounted ? (fullName || "Admin") : ""}</h4>
                  <p className="text-[13px] text-secondary mt-0.5">{mounted ? email : ""}</p>
                  <span className="mt-2 inline-block rounded-md bg-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                    {mounted && role ? role.replace(/_/g, " ") : ""}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-red-100"
              >
                <LogOut className="size-4 shrink-0" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </TooltipProvider>
  );
}
