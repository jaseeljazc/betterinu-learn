"use client";

import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Account, AccountCategory } from "@/types";
import { DataTable } from "@/components/admin/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, PieChart } from "lucide-react";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface ReportData {
  summary: { totalIncome: number; totalExpense: number; netBalance: number };
  categories: { id: string; name: string; color?: string; type: string; total: number; count: number }[];
  statement: {
    id: string; type: string; amount: number; date: string;
    description?: string; referenceNumber?: string;
    accountName?: string; toAccountName?: string;
    categoryName?: string; categoryColor?: string;
    status: string;
  }[];
}

export function ReportsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [accountId, setAccountId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [type, setType] = useState("all");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/accounts/accounts", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/accounts/categories", { credentials: "include" }).then((r) => r.json()),
    ]).then(([ad, cd]) => {
      setAccounts(ad.accounts ?? []);
      setCategories(cd.categories ?? []);
    });
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    if (accountId !== "all") params.set("accountId", accountId);
    if (categoryId !== "all") params.set("categoryId", categoryId);
    if (type !== "all") params.set("type", type);

    const res = await fetch(`/api/admin/accounts/reports?${params}`, { credentials: "include" });
    const data = await res.json();
    setReport(data);
    setLoading(false);
  }, [startDate, endDate, accountId, categoryId, type]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  function exportCSV() {
    if (!report) return;
    const header = ["Date", "Type", "Account", "To Account", "Category", "Amount", "Reference", "Description", "Status"];
    const rows = report.statement.map((r) => [
      fmtDate(r.date), r.type, r.accountName ?? "", r.toAccountName ?? "",
      r.categoryName ?? "", r.amount.toFixed(2), r.referenceNumber ?? "",
      r.description ?? "", r.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `account-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const FilterSelect = ({ value, onChange, placeholder, options }: {
    value: string; onChange: (v: string) => void; placeholder: string;
    options: { value: string; label: string }[];
  }) => (
    mounted ? (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white h-[38px] rounded-lg border-default min-w-[140px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    ) : <div className="h-[38px] w-[140px] rounded-lg border border-default bg-white" />
  );

  const categoryColumns: ColumnDef<ReportData["categories"][0]>[] = [
    {
      accessorKey: "name",
      header: "Category",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full" style={{ backgroundColor: row.original.color ?? "#64748b" }} />
          <span className="font-semibold text-foreground">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 120,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "count",
      header: "Transactions",
      size: 120,
      cell: ({ getValue }) => <span className="text-secondary">{getValue() as number}</span>,
    },
    {
      accessorKey: "total",
      header: "Total",
      size: 140,
      cell: ({ getValue }) => <span className="font-bold text-foreground">{fmtCurrency(getValue() as number)}</span>,
    },
  ];

  const statementColumns: ColumnDef<ReportData["statement"][0]>[] = [
    {
      accessorKey: "date",
      header: "Date",
      size: 110,
      cell: ({ getValue }) => <span className="text-secondary whitespace-nowrap">{fmtDate(getValue() as string)}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 110,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${type === "income" ? "bg-green-100 text-green-700" : type === "expense" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "accountName",
      header: "Account",
      size: 160,
      cell: ({ getValue }) => <span className="text-secondary max-w-[150px] truncate block" title={getValue() as string}>{getValue() as string}</span>,
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      size: 160,
      cell: ({ getValue }) => <span className="text-secondary">{getValue() as string ?? "—"}</span>,
    },
    {
      accessorKey: "referenceNumber",
      header: "Ref#",
      size: 120,
      cell: ({ getValue }) => <span className="text-secondary font-mono text-xs">{getValue() as string ?? "—"}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ getValue }) => <span className="text-secondary max-w-[200px] truncate block" title={getValue() as string}>{getValue() as string ?? "—"}</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      size: 120,
      cell: ({ row }) => {
        const type = row.original.type;
        const amt = row.original.amount;
        return (
          <span className={`font-bold whitespace-nowrap ${type === "income" ? "text-green-700" : type === "expense" ? "text-red-600" : "text-blue-700"}`}>
            {type === "expense" ? "−" : "+"}{fmtCurrency(amt)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary h-[38px]" />
        <span className="text-muted text-sm">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary h-[38px]" />
        <FilterSelect value={accountId} onChange={setAccountId} placeholder="All accounts"
          options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        <FilterSelect value={type} onChange={setType} placeholder="All types"
          options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "transfer", label: "Transfer" }]} />
        <FilterSelect value={categoryId} onChange={setCategoryId} placeholder="All categories"
          options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <button
          onClick={exportCSV}
          disabled={!report || loading}
          className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      {/* Summary */}
      {report && !('error' in report) && report.summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Income", value: report.summary.totalIncome, color: "text-green-700 bg-green-50" },
              { label: "Total Expense", value: report.summary.totalExpense, color: "text-red-600 bg-red-50" },
              { label: "Net Balance", value: report.summary.netBalance, color: report.summary.netBalance >= 0 ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-2xl border border-default p-4 ${color.split(" ")[1]} shadow-sm`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color.split(" ")[0]}`}>{fmtCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          {report.categories.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="font-bold text-foreground px-1">Category Breakdown</h3>
              <DataTable
                columns={categoryColumns}
                data={report.categories}
                emptyMessage="No category data found."
                emptyIcon={PieChart}
                searchable={false}
              />
            </div>
          )}

          {/* Statement */}
          <div className="space-y-2.5">
            <div className="px-1">
              <h3 className="font-bold text-foreground">Account Statement</h3>
              <p className="text-[11px] text-muted mt-0.5">{report.statement.length} transactions</p>
            </div>
            <DataTable
              columns={statementColumns}
              data={report.statement}
              emptyMessage="No transactions in this period."
              emptyIcon={FileText}
              searchable={false}
            />
          </div>
        </>
      )}

      {loading && (
        <div className="text-center text-muted text-sm py-8">Loading report…</div>
      )}

      {report && 'error' in report && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
          Failed to load report: {(report as any).error}
        </div>
      )}
    </div>
  );
}
