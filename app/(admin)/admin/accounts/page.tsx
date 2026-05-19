import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { AccountDashboard } from "@/components/admin/accounts/account-dashboard";

async function getPermissions() {
  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  if (!rbacStr) return null;
  try {
    return JSON.parse(decodeURIComponent(rbacStr));
  } catch {
    return null;
  }
}

export default async function AccountsPage() {
  const payload = await getPermissions();
  if (!payload || !hasPermission(payload.role, payload.permissions ?? [], "accounts", "view")) {
    redirect("/admin/dashboard");
  }

  const quickLinks = [
    { href: "/admin/accounts/accounts/new",      label: "Add Account",     color: "bg-primary/10 text-primary" },
    { href: "/admin/accounts/transactions/new",   label: "New Transaction", color: "bg-green-50 text-green-700" },
    { href: "/admin/accounts/transfers",          label: "Transfers",       color: "bg-blue-50 text-blue-700" },
    { href: "/admin/accounts/reports",            label: "Reports",         color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Account Manager
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Track income, expenses, and transfers across all accounts.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80 ${l.color}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <AccountDashboard />
    </div>
  );
}
