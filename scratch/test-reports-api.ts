import { sql } from "../src/lib/db";

async function run() {
  try {
    const startDate = "2026-05-01";
    const endDate = "2026-05-19";
    const accountId = null;
    const categoryId = null;
    const type = null;

    console.log("Testing summaryRows...");
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
    console.log("summaryRows OK", summaryRows.length);

    console.log("Testing monthlyRows...");
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
    console.log("monthlyRows OK", monthlyRows.length);

    console.log("Testing categoryRows...");
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
    console.log("categoryRows OK", categoryRows.length);

    console.log("Testing statementRows...");
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
    console.log("statementRows OK", statementRows.length);

  } catch (err: any) {
    console.error("SQL Error:", err.message);
  }
}

run();
