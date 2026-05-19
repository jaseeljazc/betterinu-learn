import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Wallet } from "lucide-react";
import { AccountsTable } from "@/components/admin/accounts/accounts-table";

async function getPermissions() {
  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  if (!rbacStr) return null;
  try { return JSON.parse(decodeURIComponent(rbacStr)); } catch { return null; }
}

export default async function AccountsListPage() {
  const payload = await getPermissions();
  if (!payload || !hasPermission(payload.role, payload.permissions ?? [], "accounts", "view")) {
    redirect("/admin/dashboard");
  }
  const canEdit = hasPermission(payload.role, payload.permissions ?? [], "accounts", "create");

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Accounts</h1>
          </div>
          <p className="text-sm text-secondary">Manage your organization's financial accounts.</p>
        </div>
      </div>
      <AccountsTable canEdit={canEdit} />
    </div>
  );
}
