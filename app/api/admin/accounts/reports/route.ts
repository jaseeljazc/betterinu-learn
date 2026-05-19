import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";

// ── GET /api/admin/accounts/reports ──────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type");

  try {
    // Summary aggregates
    const summaryRows = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END), 0) AS total_transfers
      FROM account_transactions
      WHERE status != 'void'
        ${startDate ? sql`AND date >= ${startDate}` : sql``}
        ${endDate ? sql`AND date <= ${endDate}` : sql``}
        ${accountId ? sql`AND (account_id = ${accountId} OR to_account_id = ${accountId})` : sql``}
        ${categoryId ? sql`AND category_id = ${categoryId}` : sql``}
        ${type ? sql`AND type = ${type}` : sql``}
    `;

    // Monthly breakdown (last 6 months)
    const monthlyRows = await sql`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM account_transactions
      WHERE status != 'void'
        AND date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `;

    // Category breakdown
    const categoryRows = await sql`
      SELECT
        c.id, c.name, c.color, c.type,
        SUM(t.amount) AS total,
        COUNT(t.id) AS count
      FROM account_transactions t
      JOIN account_categories c ON c.id = t.category_id
      WHERE t.status != 'void'
        ${startDate ? sql`AND t.date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.date <= ${endDate}` : sql``}
      GROUP BY c.id, c.name, c.color, c.type
      ORDER BY total DESC
    `;

    // Statement rows (passbook style)
    const statementRows = await sql`
      SELECT
        t.id, t.type, t.amount, t.date::text AS date, t.description, t.reference_number,
        t.status, t.created_at::text AS created_at,
        a.name AS account_name,
        ta.name AS to_account_name,
        c.name AS category_name, c.color AS category_color
      FROM account_transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts ta ON ta.id = t.to_account_id
      LEFT JOIN account_categories c ON c.id = t.category_id
      WHERE t.status != 'void'
        ${startDate ? sql`AND t.date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.date <= ${endDate}` : sql``}
        ${accountId ? sql`AND (t.account_id = ${accountId} OR t.to_account_id = ${accountId})` : sql``}
        ${categoryId ? sql`AND t.category_id = ${categoryId}` : sql``}
        ${type ? sql`AND t.type = ${type}` : sql``}
      ORDER BY t.date DESC, t.created_at DESC
    `;

    const s = summaryRows[0];
    return NextResponse.json({
      summary: {
        totalIncome: parseFloat(s.total_income as string),
        totalExpense: parseFloat(s.total_expense as string),
        netBalance: parseFloat(s.total_income as string) - parseFloat(s.total_expense as string),
      },
      monthly: monthlyRows.map((r) => ({
        month: r.month,
        income: parseFloat(r.income as string),
        expense: parseFloat(r.expense as string),
      })),
      categories: categoryRows.map((r) => ({
        id: r.id, name: r.name, color: r.color, type: r.type,
        total: parseFloat(r.total as string),
        count: parseInt(r.count as string),
      })),
      statement: statementRows.map((r) => ({
        id: r.id, type: r.type,
        amount: parseFloat(r.amount as string),
        date: r.date, description: r.description,
        referenceNumber: r.reference_number,
        status: r.status,
        accountName: r.account_name, toAccountName: r.to_account_name,
        categoryName: r.category_name, categoryColor: r.category_color,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
