"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
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
  Wallet,
  LibraryBig,
} from "lucide-react";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { clientAuth } from "@/lib/firebase-client";
import { ChangePasswordModal } from "@/components/shared/change-password-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [showChangePassword, setShowChangePassword] = useState(false);

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
              { href: "/admin/admins", label: "Employees",          Icon: UsersRound  },
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

  async function handleLogout() {
    await clientAuth.signOut();
    document.cookie = "__session=; path=/; max-age=0";
    router.push("/admin/login");
  }

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  function renderSubList(subItems: SubItem[], isOpen: boolean) {
    return (
      <AnimatedSubList isOpen={isOpen}>
        {subItems.map((sub) => {
          const subActive = sub.exact
            ? pathname === sub.href
            : pathname.startsWith(sub.href);
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
                  const subActive = sub.exact
                    ? pathname === sub.href
                    : pathname.startsWith(sub.href);
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
      <div className="flex items-center rounded-lg overflow-hidden">
        <Link
          href={href}
          className={[
            "flex flex-1 items-center gap-3 px-3 py-2.5 transition-colors",
            active
              ? "bg-primary/10 text-primary font-bold"
              : "text-secondary font-medium hover:bg-subtle hover:text-primary",
          ].join(" ")}
        >
          <Icon className="size-5 shrink-0" />
          <span className="text-sm">{label}</span>
        </Link>
        <button
          onClick={() => toggleSection(href)}
          className={[
            "px-2 py-2.5 transition-colors",
            active
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-secondary hover:bg-subtle hover:text-primary",
          ].join(" ")}
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
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex w-full items-center rounded-lg text-secondary transition-colors hover:bg-subtle hover:text-primary ${
                  collapsed
                    ? "justify-center p-2.5"
                    : "gap-3 px-3 py-2 text-sm font-medium"
                }`}
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-3.5" />
                </div>
                {!collapsed && (
                  <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                    <span className="truncate w-full font-semibold text-foreground text-sm leading-tight">
                      {mounted ? fullName || "Admin" : ""}
                    </span>
                    <span className="truncate w-full text-[11px] text-muted">
                      {mounted ? email || "Loading..." : ""}
                    </span>
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="end"
              className="w-60 p-5 rounded-2xl"
            >
              <div className="flex flex-col items-center gap-3 text-center mb-5">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="size-7" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base leading-tight">
                    {mounted ? fullName || "Admin" : ""}
                  </h4>
                  <p className="text-[13px] text-secondary mt-0.5">
                    {mounted ? email : ""}
                  </p>
                  <span className="mt-2 inline-block rounded-md bg-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                    {mounted && role ? role.replace(/_/g, " ") : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-subtle text-secondary px-4 py-2.5 text-sm font-bold transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <KeyRound className="size-4 shrink-0" />
                Change Password
              </button>

              <button
                onClick={() => handleLogout()}
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

    {/* Change Password Modal */}
    {showChangePassword && (
      <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
    )}
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