"use client";

import { useState, useEffect } from "react";
import { Pencil, Power, Plus, Wallet, MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Account } from "@/types";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { AccountFormDialog } from "./account-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  digital_wallet: "Digital Wallet",
  petty_cash: "Petty Cash",
};

const TYPE_BADGE: Record<string, string> = {
  cash: "bg-green-50 text-green-700 border-green-200",
  bank: "bg-blue-50 text-blue-700 border-blue-200",
  digital_wallet: "bg-purple-50 text-purple-700 border-purple-200",
  petty_cash: "bg-amber-50 text-amber-700 border-amber-200",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface AccountsTableProps {
  canEdit: boolean;
}

export function AccountsTable({ canEdit }: AccountsTableProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; account?: Account }>({ open: false });

  function fetchAccounts() {
    setLoading(true);
    fetch("/api/admin/accounts/accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function handleToggle(account: Account) {
    setToggling(account.id);
    try {
      await fetch(`/api/admin/accounts/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isActive: !a.isActive } : a))
      );
    } finally {
      setToggling(null);
    }
  }

  function handleSaved() {
    fetchAccounts();
    setDialog({ open: false });
  }

  const columns: ColumnDef<Account>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 140,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const t = getValue() as string;
        return (
          <Badge variant="outline" className={TYPE_BADGE[t]}>
            {TYPE_LABELS[t]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "accountNumber",
      header: "Account Info",
      size: 160,
      enableSorting: false,
      cell: ({ row }) => {
        const acc = row.original;
        if (!acc.accountNumber && !acc.ifscCode) return <span className="text-muted italic text-xs">—</span>;
        return (
          <div className="flex flex-col">
            {acc.accountNumber && <span className="font-mono text-[11px] text-foreground">{acc.accountNumber}</span>}
            {acc.ifscCode && <span className="font-mono text-[10px] text-secondary">IFSC: {acc.ifscCode}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Bal.",
      size: 140,
      cell: ({ getValue }) => (
        <span className="text-secondary">{fmtCurrency(getValue() as number)}</span>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Current Bal.",
      size: 140,
      cell: ({ getValue }) => {
        const n = getValue() as number;
        return (
          <span className={`font-bold ${n >= 0 ? "text-green-700" : "text-red-600"}`}>
            {fmtCurrency(n)}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const active = getValue() as boolean;
        return (
          <Badge
            variant="outline"
            className={active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}
          >
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "Actions",
            size: 64,
            enableSorting: false,
            cell: ({ row }: { row: { original: Account } }) => {
              const acc = row.original;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-default bg-white shadow-lg">
                    <DropdownMenuItem
                      onClick={() => setDialog({ open: true, account: acc })}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-0.5 border-t border-default/50" />
                    <DropdownMenuItem
                      onClick={() => handleToggle(acc)}
                      disabled={toggling === acc.id}
                      variant="destructive"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer disabled:opacity-50"
                    >
                      <Power className="size-3.5" />
                      {toggling === acc.id ? "Updating…" : acc.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } as ColumnDef<Account>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={accounts}
        loading={loading}
        searchable
        searchPlaceholder="Search accounts…"
        searchColumn="name"
        filters={[
          {
            column: "type",
            label: "Type",
            options: [
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank" },
              { value: "digital_wallet", label: "Digital Wallet" },
              { value: "petty_cash", label: "Petty Cash" },
            ],
          },
        ]}
        emptyMessage="No accounts yet."
        emptyIcon={Wallet}
        actions={
          canEdit ? (
            <button
              onClick={() => setDialog({ open: true })}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-sm"
            >
              <Plus className="size-4" /> Add Account
            </button>
          ) : undefined
        }
      />

      {dialog.open && (
        <AccountFormDialog
          account={dialog.account}
          onClose={() => setDialog({ open: false })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
