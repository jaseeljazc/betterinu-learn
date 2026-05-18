import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Wallet } from "lucide-react";
import { AccountForm } from "@/components/admin/accounts/account-form";

async function getPermissions() {
  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  if (!rbacStr) return null;
  try { return JSON.parse(decodeURIComponent(rbacStr)); } catch { return null; }
}

export default async function NewAccountPage() {
  const payload = await getPermissions();
  if (!payload || !hasPermission(payload.role, payload.permissions ?? [], "accounts", "create")) {
    redirect("/admin/accounts/accounts");
  }

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Add Account</h1>
          </div>
          <p className="text-sm text-secondary">Create a new financial account for tracking.</p>
        </div>
        <AccountForm />
      </div>
    </div>
  );
}
