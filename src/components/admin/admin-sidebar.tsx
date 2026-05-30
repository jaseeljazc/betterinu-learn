"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  UsersRound,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  UserCircle,
  Wallet,
  LibraryBig,
} from "lucide-react";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { clientAuth } from "@/lib/firebase-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type SubItem = { href: string; label: string; exact?: boolean };

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  subItems?: SubItem[];
  /** items nested under a group header instead of a link */
  groupItems?: SubItem[];
};

/* ------------------------------------------------------------------ */
/*  Fallback nav (before permissions load)                             */
/* ------------------------------------------------------------------ */

const FALLBACK_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  {
    href: "#academics",
    label: "Academics",
    Icon: LibraryBig,
    groupItems: [
      { href: "/admin/courses",                label: "Courses" },
      { href: "/admin/students",               label: "Students" },
      { href: "/admin/students/overdue",       label: "Overdue Payments" },
      { href: "/admin/submissions",            label: "Submissions" },
      { href: "/admin/standalone-assignments", label: "Standalone Tasks" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

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

  const isSubActive = (sub: SubItem) => {
    if (sub.exact) return pathname === sub.href
    if (sub.href === "/admin/students") {
      return (
        pathname.startsWith("/admin/students") &&
        !pathname.startsWith("/admin/students/overdue")
      )
    }
    return pathname.startsWith(sub.href)
  };

  // Track which expandable sections are open (by href key)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Build nav based on permissions */
  const academicsGroupItems: SubItem[] = [
    ...(can("courses", "view")
      ? [{ href: "/admin/courses", label: "Courses" }]
      : []),
    ...(can("students", "view")
      ? [{ href: "/admin/students", label: "Students" }]
      : []),
    ...(can("accounts", "view")
      ? [{ href: "/admin/students/overdue", label: "Overdue Payments" }]
      : []),
    ...(can("tasks", "view")
      ? [{ href: "/admin/submissions", label: "Submissions" }]
      : []),
    ...(can("tasks", "view")
      ? [{ href: "/admin/standalone-assignments", label: "Standalone Tasks" }]
      : []),
  ];

  const nav: NavItem[] = mounted
    ? [
        { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
        ...(academicsGroupItems.length > 0
          ? [
              {
                href: "#academics",
                label: "Academics",
                Icon: LibraryBig,
                groupItems: academicsGroupItems,
              } satisfies NavItem,
            ]
          : []),
        ...(can("employees", "view")
          ? [
              {
                href: "/admin/employees",
                label: "Employees",
                Icon: Users,
                subItems: [
                  { href: "/admin/employees",             label: "Directory",   exact: true },
                  { href: "/admin/employees/departments", label: "Departments" },
                  { href: "/admin/employees/payroll",     label: "Payroll" },
                  ...(can("attendance", "view")
                    ? [{ href: "/admin/employees/attendance", label: "Attendance" }]
                    : []),
                ],
              } satisfies NavItem,
            ]
          : []),
        ...(can("accounts", "view")
          ? [
              {
                href: "/admin/accounts",
                label: "Accounts",
                Icon: Wallet,
                subItems: [
                  { href: "/admin/accounts",              label: "Dashboard",         exact: true },
                  { href: "/admin/accounts/accounts",     label: "Manage Accounts" },
                  { href: "/admin/accounts/transactions", label: "Transactions" },
                  { href: "/admin/accounts/categories",   label: "Categories" },
                  { href: "/admin/accounts/reports",      label: "Reports" },
                ],
              } satisfies NavItem,
            ]
          : []),
        ...(isSuperAdmin
          ? [
              { href: "/admin/admins", label: "Admins",              Icon: UsersRound  },
              { href: "/admin/roles",  label: "Roles & Permissions", Icon: ShieldCheck },
            ]
          : []),
      ]
    : FALLBACK_NAV;

  /* Auto-open the section whose child is currently active */
  useEffect(() => {
    const updates: Record<string, boolean> = {};
    nav.forEach((item) => {
      const children = item.subItems ?? item.groupItems ?? [];
      if (children.some((s) => pathname.startsWith(s.href))) {
        updates[item.href] = true;
      }
    });
    if (Object.keys(updates).length) {
      setOpenSections((prev) => ({ ...prev, ...updates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted]);

  function toggleSection(href: string) {
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      if (!prev[href]) {
        next[href] = true;
      }
      return next;
    });
  }



  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  function renderSubList(subItems: SubItem[], isOpen: boolean) {
    return (
      <AnimatedSubList isOpen={isOpen}>
        {subItems.map((sub) => {
          const subActive = isSubActive(sub);
          return (
            <Link
              key={sub.href}
              href={sub.href}
              className={[
                "relative text-sm py-2 px-3 rounded-md transition-colors",
                subActive
                  ? "text-primary font-bold bg-primary/5"
                  : "text-muted hover:text-primary hover:bg-subtle",
              ].join(" ")}
            >
              <span
                className={`absolute left-[-11px] top-1/2 -translate-y-1/2 w-2 h-px ${
                  subActive ? "bg-primary" : "bg-default"
                }`}
              />
              {sub.label}
            </Link>
          );
        })}
      </AnimatedSubList>
    );
  }

  function renderNavItem(item: NavItem) {
    const { href, label, Icon, subItems, groupItems } = item;

    const isGroup = !!groupItems;           // group header (not a real link)
    const isExpandable = isGroup || !!subItems; // has children at all

    // Active state
    const childItems = subItems ?? groupItems ?? [];
    const childActive = childItems.some((s) => pathname.startsWith(s.href));
    const selfActive  = !isGroup && pathname.startsWith(href);
    const active      = selfActive || childActive;

    const isOpen = openSections[href] ?? false;

    /* ---- Collapsed sidebar: show tooltip with fly-out sub-menu ---- */
    if (collapsed) {
      const trigger = (
        <div
          key={href}
          className={[
            "flex items-center justify-center rounded-lg p-3 transition-colors cursor-pointer",
            active
              ? "bg-primary/10 text-primary"
              : "text-secondary hover:bg-subtle hover:text-primary",
          ].join(" ")}
          onClick={isGroup ? undefined : undefined}
        >
          <Icon className="size-5 shrink-0" />
        </div>
      );

      if (isExpandable) {
        // For groups/expandable in collapsed mode: tooltip shows fly-out list
        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <div>{trigger}</div>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0 rounded-xl overflow-hidden shadow-lg border border-default bg-white min-w-[180px]">
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-default">
                {label}
              </div>
              <div className="py-1.5 flex flex-col">
                {childItems.map((sub) => {
                  const subActive = isSubActive(sub);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={[
                        "px-3 py-2 text-sm transition-colors",
                        subActive
                          ? "text-primary font-bold bg-primary/5"
                          : "text-secondary hover:text-primary hover:bg-subtle",
                      ].join(" ")}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }

      // Plain link in collapsed mode
      return (
        <Tooltip key={href}>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className={[
                "flex items-center justify-center rounded-lg p-3 transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-secondary hover:bg-subtle hover:text-primary",
              ].join(" ")}
            >
              <Icon className="size-5 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    /* ---- Expanded sidebar ----------------------------------------- */

    const rowBase = [
      "flex items-center rounded-lg transition-colors",
      "gap-3 px-3 py-2.5",
      active
        ? "bg-primary/10 text-primary font-bold"
        : "text-secondary font-medium hover:bg-subtle hover:text-primary",
    ].join(" ");

    const chevron = isExpandable && (
      <ChevronDown
        className={`ml-auto size-4 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180" : "rotate-0"
        }`}
      />
    );

    const row = isGroup ? (
      // Group header — not a real link, just a toggle button
      <button
        onClick={() => toggleSection(href)}
        className={rowBase + " w-full text-left"}
      >
        <Icon className="size-5 shrink-0" />
        <span className="text-sm">{label}</span>
        {chevron}
      </button>
    ) : isExpandable ? (
      // Real link that also toggles
      <div
        className={[
          "flex items-center justify-between rounded-lg transition-colors w-full",
          active
            ? "bg-primary/10 text-primary font-bold"
            : "text-secondary font-medium hover:bg-subtle hover:text-primary",
        ].join(" ")}
      >
        <Link
          href={href}
          className="flex flex-1 items-center gap-3 px-3 py-2.5"
        >
          <Icon className="size-5 shrink-0" />
          <span className="text-sm">{label}</span>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSection(href);
          }}
          className="px-3 py-2.5 text-secondary hover:text-primary transition-colors flex items-center justify-center"
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
        >
          <ChevronDown
            className={`size-4 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>
    ) : (
      // Plain link
      <Link href={href} className={rowBase}>
        <Icon className="size-5 shrink-0" />
        <span className="text-sm">{label}</span>
      </Link>
    );

    return (
      <div key={href} className="flex flex-col">
        {row}
        {isExpandable && renderSubList(childItems, isOpen)}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  JSX                                                               */
  /* ---------------------------------------------------------------- */

  return (
    <>
    <TooltipProvider delayDuration={0}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-default bg-white transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Header */}
        <div
          className={`flex h-16 items-center border-b border-default ${
            collapsed ? "justify-center px-0" : "px-4 justify-between"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/dashboard"
                className="flex items-center h-8 shrink-0"
              >
                <Image
                  src="/new-logo.svg"
                  alt="Betterinu Logo"
                  width={100}
                  height={32}
                  unoptimized
                  className="h-full w-auto object-contain"
                />
              </Link>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary hidden xl:inline-block">
                Admin
              </span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className={`flex items-center justify-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary ${
                  collapsed ? "p-3 w-full" : "p-1.5"
                }`}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-5" />
                ) : (
                  <PanelLeftClose className="size-5 shrink-0" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Nav */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full py-4">
            <nav
              className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}
            >
              {nav.map(renderNavItem)}
            </nav>
          </ScrollArea>
        </div>

        {/* Bottom controls */}
        <div
          className={`shrink-0 border-t border-default py-2 ${
            collapsed ? "px-2" : "px-3"
          }`}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/profile"
                  className={[
                    "mb-2 flex items-center justify-center rounded-lg p-2.5 transition-colors",
                    pathname.startsWith("/admin/profile")
                      ? "bg-primary/10 text-primary"
                      : "text-secondary hover:bg-subtle hover:text-primary",
                  ].join(" ")}
                >
                  <UserCircle className="size-5 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">My Profile</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/admin/profile"
              className={[
                "mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin/profile")
                  ? "bg-primary/10 font-bold text-primary"
                  : "font-medium text-secondary hover:bg-subtle hover:text-primary",
              ].join(" ")}
            >
              <UserCircle className="size-5 shrink-0" />
              My Profile
            </Link>
          )}
        </div>
      </aside>
    </TooltipProvider>
  </>
  );
}

/* ------------------------------------------------------------------ */
/*  AnimatedSubList                                                     */
/* ------------------------------------------------------------------ */

function AnimatedSubList({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{
        maxHeight: isOpen ? (ref.current?.scrollHeight ?? 500) : 0,
        overflow: "hidden",
        transition: "max-height 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="mt-1 ml-9 flex flex-col space-y-1 relative before:absolute before:left-[-11px] before:top-2 before:bottom-2 before:w-px before:bg-default">
        {children}
      </div>
    </div>
  );
}
