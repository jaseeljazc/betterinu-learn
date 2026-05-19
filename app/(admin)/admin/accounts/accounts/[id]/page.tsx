import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Wallet } from "lucide-react";
import { sql } from "@/lib/db";
import { AccountForm } from "@/components/admin/accounts/account-form";
import type { Account } from "@/types";

async function getPermissions() {
  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  if (!rbacStr) return null;
  try { return JSON.parse(decodeURIComponent(rbacStr)); } catch { return null; }
}

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const payload = await getPermissions();
  if (!payload || !hasPermission(payload.role, payload.permissions ?? [], "accounts", "edit")) {
    redirect("/admin/accounts/accounts");
  }

  const { id } = await params;
  const rows = await sql`SELECT * FROM accounts WHERE id = ${id}`;
  if (!rows.length) notFound();

  const r = rows[0];
  const account: Account = {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Account["type"],
    accountNumber: (r.account_number as string) ?? undefined,
    openingBalance: parseFloat(r.opening_balance as string),
    currentBalance: parseFloat(r.current_balance as string),
    isActive: r.is_active as boolean,
    createdAt: (r.created_at as Date).toISOString(),
  };

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Edit Account</h1>
          </div>
          <p className="text-sm text-secondary">Update details for <span className="font-semibold">{account.name}</span>.</p>
        </div>
        <AccountForm account={account} />
      </div>
    </div>
  );
}
