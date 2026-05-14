"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { clientAuth } from "@/lib/firebase-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", Icon: BookOpen },
  { href: "/admin/students", label: "Students", Icon: Users },
  { href: "/admin/submissions", label: "Submissions", Icon: ClipboardList },
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
              <img
                src="/new-logo.svg"
                alt="Betterinu Logo"
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

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={`flex w-full items-center rounded-lg text-secondary transition-colors hover:bg-red-50 hover:text-red-600 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5 text-sm font-medium"}`}
              >
                <LogOut className="size-5 shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign out</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
