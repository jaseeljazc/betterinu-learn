"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, ArrowRight,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import type { Account } from "@/types";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const TYPE_ICON = {
  income: <ArrowUpRight className="size-4 text-green-600" />,
  expense: <ArrowDownLeft className="size-4 text-red-500" />,
  transfer: <ArrowLeftRight className="size-4 text-blue-500" />,
};

const CHART_COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#f97316"];

interface DashboardData {
  accounts: Account[];
  summary: { totalIncome: number; totalExpense: number; netBalance: number };
  monthly: { month: string; income: number; expense: number }[];
  categories: { id: string; name: string; color?: string; total: number }[];
  recentTransactions: {
    id: string; type: string; amount: number; date: string;
    description?: string; accountName?: string; categoryName?: string; status: string;
  }[];
  totalBalance: number;
}

export function AccountDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    Promise.all([
      fetch("/api/admin/accounts/accounts", { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/admin/accounts/reports?startDate=${startDate}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/accounts/transactions?status=confirmed", { credentials: "include" }).then((r) => r.json()),
    ]).then(([accountsData, reportsData, txData]) => {
      const accounts: Account[] = accountsData.accounts ?? [];
      const totalBalance = accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.currentBalance, 0);

      const recentTransactions = (txData.transactions ?? []).slice(0, 10).map((t: Record<string, unknown>) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        date: t.date,
        description: t.description,
        accountName: (t.account as { name?: string })?.name,
        categoryName: (t.category as { name?: string })?.name,
        status: t.status,
      }));

      setData({
        accounts,
        summary: reportsData.summary ?? { totalIncome: 0, totalExpense: 0, netBalance: 0 },
        monthly: reportsData.monthly ?? [],
        categories: (reportsData.categories ?? []).slice(0, 8),
        recentTransactions,
        totalBalance,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-md border border-default bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const monthLabels = data.monthly.map((m) => m.month.slice(5)); // MM
  const chartMonthly = data.monthly.map((m) => ({
    month: new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" }),
    Income: m.income,
    Expense: m.expense,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SummaryCard
          label="Total Balance"
          value={fmtCurrency(data.totalBalance)}
          icon={<Wallet className="size-5 text-primary" />}
          color="primary"
        />
        <SummaryCard
          label="This Month Income"
          value={fmtCurrency(data.summary.totalIncome)}
          icon={<TrendingUp className="size-5 text-green-600" />}
          color="green"
        />
        <SummaryCard
          label="This Month Expense"
          value={fmtCurrency(data.summary.totalExpense)}
          icon={<TrendingDown className="size-5 text-red-500" />}
          color="red"
        />
      </div>

      {/* Account balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {data.accounts.filter((a) => a.isActive).map((acc) => (
          <div key={acc.id} className="rounded-md border border-default bg-white p-4 ">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider truncate">{acc.name}</p>
            <p className={`mt-1.5 text-lg font-bold ${acc.currentBalance > 0 ? "text-green-700" : "text-red-600"}`}>
              {fmtCurrency(acc.currentBalance)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Bar Chart */}
        <div className="rounded-md border border-default bg-white p-5 ">
          <h3 className="text-sm font-bold text-foreground mb-4">Monthly Income vs Expense</h3>
          {chartMonthly.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartMonthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Donut */}
        <div className="rounded-md border border-default bg-white p-5 ">
          <h3 className="text-sm font-bold text-foreground mb-4">Expense by Category (This Month)</h3>
          {data.categories.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No category data yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={160}>
                <PieChart>
                  <Pie data={data.categories} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {data.categories.map((c, i) => (
                      <Cell key={c.id} fill={c.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => fmtCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {data.categories.slice(0, 6).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-[11px]">
                    <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate text-secondary">{c.name}</span>
                    <span className="ml-auto font-bold text-foreground">{fmtCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-md border border-default bg-white  overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-default">
          <h3 className="font-bold text-foreground">Recent Transactions</h3>
          <Link href="/admin/accounts/transactions" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-default">
            {data.recentTransactions.length === 0 ? (
              <tr><td className="px-5 py-8 text-center text-muted">No transactions yet.</td></tr>
            ) : (
              data.recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-subtle/50 transition-colors">
                  <td className="px-5 py-3 w-8">{TYPE_ICON[t.type as keyof typeof TYPE_ICON]}</td>
                  <td className="px-2 py-3">
                    <p className="font-semibold text-foreground text-sm truncate max-w-[200px]">{t.description || t.categoryName || "—"}</p>
                    <p className="text-[11px] text-muted">{t.accountName}</p>
                  </td>
                  <td className="px-2 py-3 text-[11px] text-muted whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className={`px-5 py-3 font-bold text-right ${t.type === "income" ? "text-green-700" : t.type === "expense" ? "text-red-600" : "text-blue-600"}`}>
                    {t.type === "expense" ? "−" : "+"}{fmtCurrency(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: "primary" | "green" | "red";
}) {
  const bg = color === "primary" ? "bg-primary/10" : color === "green" ? "bg-green-100" : "bg-red-100";
  return (
    <div className="rounded-md border border-default bg-white p-5 ">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-secondary">{label}</p>
        <div className={`rounded-md p-2 ${bg}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
