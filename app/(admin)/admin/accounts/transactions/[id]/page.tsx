import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Wallet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TransactionDetailPageClient } from "@/components/admin/accounts/transaction-detail-client";

async function getPermissions() {
  const cookieStore = await cookies();
  const rbacStr = cookieStore.get("__rbac")?.value;
  if (!rbacStr) return null;
  try { return JSON.parse(decodeURIComponent(rbacStr)); } catch { return null; }
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const payload = await getPermissions();
  if (!payload || !hasPermission(payload.role, payload.permissions ?? [], "accounts", "view")) {
    redirect("/admin/accounts/transactions");
  }
  const canEdit = hasPermission(payload.role, payload.permissions ?? [], "accounts", "edit");
  const { id } = await params;
//hiiirr
return (
  <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-6">
    <TransactionDetailPageClient transactionId={id} canEdit={canEdit} />
  </div>
);
}
