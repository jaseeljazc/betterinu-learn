"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, Pencil, Ban, Plus, ReceiptText, MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AccountTransaction } from "@/types";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { TransactionFormDialog } from "./transaction-form-dialog";
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

const TYPE_CFG = {
  income:   { label: "Income",   cls: "bg-green-50 text-green-700 border-green-200" },
  expense:  { label: "Expense",  cls: "bg-red-50 text-red-700 border-red-200" },
  transfer: { label: "Transfer", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const STATUS_CFG = {
  confirmed: { label: "Confirmed", cls: "bg-green-50 text-green-700 border-green-200" },
  pending:   { label: "Pending",   cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  void:      { label: "Void",      cls: "bg-gray-50 text-gray-600 border-gray-200" },
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface TransactionsTableProps {
  canEdit: boolean;
}

export function TransactionsTable({ canEdit }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    transactionId?: string;
    initialData?: unknown;
  }>({ open: false, mode: "create" });

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/accounts/transactions?t=${Date.now()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSaved() {
    fetchData();
    setDialog({ open: false, mode: "create" });
  }

  const columns: ColumnDef<AccountTransaction>[] = [
    {
      accessorKey: "date",
      header: "Date & Time",
      size: 130,
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-xs text-foreground font-medium flex items-baseline gap-1.5">
          <span>{fmtDate(row.original.date)}</span>
          {row.original.createdAt && (
            <span className="text-muted text-[10px] font-normal">{fmtTime(row.original.createdAt)}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const t = getValue() as keyof typeof TYPE_CFG;
        const cfg = TYPE_CFG[t] ?? TYPE_CFG.expense;
        return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
      },
    },
    {
      id: "accountName",
      accessorFn: (row) => (row.account as { name?: string } | undefined)?.name ?? "",
      header: "Account",
      size: 160,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-secondary truncate block max-w-[150px]">{getValue() as string}</span>
      ),
    },
    {
      id: "categoryName",
      accessorFn: (row) => (row.category as { name?: string } | undefined)?.name ?? "",
      header: "Category",
      size: 140,
      enableSorting: false,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return v ? (
          <span className="text-secondary">{v}</span>
        ) : (
          <span className="text-muted italic text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-secondary text-xs line-clamp-1">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      size: 130,
      cell: ({ row }) => {
        const { type, amount } = row.original;
        const color =
          type === "income" ? "text-green-700" : type === "expense" ? "text-red-600" : "text-blue-700";
        const sign = type === "expense" ? "−" : "+";
        return <span className={`font-bold ${color}`}>{sign}{fmtCurrency(amount)}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const s = getValue() as keyof typeof STATUS_CFG;
        const cfg = STATUS_CFG[s] ?? STATUS_CFG.confirmed;
        return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const t = row.original;
        const isVoid = t.status === "void";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-default bg-white shadow-lg">
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/accounts/transactions/${t.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
                >
                  <Eye className="size-3.5" /> View
                </Link>
              </DropdownMenuItem>
              {canEdit && !isVoid && (
                <>
                  <DropdownMenuItem
                    onClick={() => setDialog({ open: true, mode: "edit", transactionId: t.id, initialData: t })}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0.5 border-t border-default/50" />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/admin/accounts/transactions/${t.id}?void=1`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Ban className="size-3.5" /> Void
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        searchable
        searchPlaceholder="Search description…"
        searchColumn="description"
        filters={[
          {
            column: "type",
            label: "Type",
            options: [
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
              { value: "transfer", label: "Transfer" },
            ],
          },
          {
            column: "status",
            label: "Status",
            options: [
              { value: "confirmed", label: "Confirmed" },
              { value: "pending", label: "Pending" },
              { value: "void", label: "Void" },
            ],
          },
        ]}
        emptyMessage="No transactions found."
        emptyIcon={ReceiptText}
        actions={
          canEdit ? (
            <button
              onClick={() => setDialog({ open: true, mode: "create" })}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-sm whitespace-nowrap"
            >
              <Plus className="size-4" /> New Transaction
            </button>
          ) : undefined
        }
      />

      {dialog.open && (
        <TransactionFormDialog
          transactionId={dialog.transactionId}
          initialData={dialog.initialData}
          mode={dialog.mode}
          onClose={() => setDialog({ open: false, mode: "create" })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
