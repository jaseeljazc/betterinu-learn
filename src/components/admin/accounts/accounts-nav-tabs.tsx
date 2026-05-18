"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/accounts",              label: "Dashboard" },
  { href: "/admin/accounts/accounts",     label: "Accounts" },
  { href: "/admin/accounts/transactions", label: "Transactions" },
  { href: "/admin/accounts/transfers",    label: "Transfers" },
  { href: "/admin/accounts/categories",   label: "Categories" },
  { href: "/admin/accounts/reports",      label: "Reports" },
];

export function AccountsNavTabs({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 mb-6 overflow-x-auto border-b border-default pb-0">
      {TABS.map((tab) => {
        const isActive = tab.label.toLowerCase() === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors whitespace-nowrap border-b-2 -mb-px",
              isActive
                ? "text-primary border-primary bg-primary/5"
                : "text-secondary border-transparent hover:text-primary hover:bg-subtle"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
