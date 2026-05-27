import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { format } from "date-fns"

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "payroll", "create") // Must have create permission to disburse
  if (auth instanceof NextResponse) return auth

  const { month, runIds, accountId } = await req.json()

  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 })
  }

  const creatorId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId

  // Fetch runs to disburse
  // Either explicitly passed runIds, or all 'approved' runs for the month
  const pendingRows = await sql`
    SELECT
      pr.id, pr.employee_id, pr.net_salary, pr.status, e.full_name
    FROM payroll_runs pr
    JOIN employees e ON e.id = pr.employee_id
    WHERE pr.month = ${month}
      ${runIds && runIds.length ? sql`AND pr.id = ANY(${runIds}::uuid[])` : sql`AND pr.status = 'approved'`}
  `

  if (!pendingRows.length) {
    return NextResponse.json({ error: "No approved payroll runs to disburse" }, { status: 400 })
  }

  // Ensure all fetched runs are actually approved (if runIds were explicitly provided, someone might have passed a draft)
  const invalidRuns = pendingRows.filter(r => r.status !== 'approved')
  if (invalidRuns.length) {
    return NextResponse.json({ error: "Can only disburse 'approved' payroll runs" }, { status: 400 })
  }

  // Get default cash account (just picking first active account for simplicity unless accountId is provided)
  // The requirements didn't specify picking an account, but it implies creating a ledger transaction.
  let targetAccountId = accountId

  if (!targetAccountId) {
    const accRows = await sql`SELECT id FROM accounts WHERE is_active = true LIMIT 1`
    if (!accRows.length) {
      return NextResponse.json({ error: "No active accounts found to disburse from" }, { status: 400 })
    }
    targetAccountId = accRows[0].id
  }

  // Get or create Salaries category
  let salariesCategoryId: string
  const catRows = await sql`
    SELECT id FROM account_categories WHERE name ILIKE 'Salaries' AND type = 'expense' LIMIT 1
  `
  if (catRows.length) {
    salariesCategoryId = catRows[0].id as string
  } else {
    const inserted = await sql`
      INSERT INTO account_categories (name, type, is_system)
      VALUES ('Salaries', 'expense', TRUE)
      RETURNING id
    `
    salariesCategoryId = inserted[0].id as string
  }

  const today = format(new Date(), "yyyy-MM-dd")
  let totalDisbursed = 0

  for (const pr of pendingRows) {
    const net = Number(pr.net_salary)

    // Create account transaction
    const txRows = await sql`
      INSERT INTO account_transactions
        (type, account_id, category_id, amount, date, description, status, employee_id, created_by)
      VALUES (
        'expense', ${targetAccountId}, ${salariesCategoryId},
        ${net}, ${today}, ${`Salary - ${month}`},
        'confirmed', ${pr.employee_id}, ${creatorId}
      )
      RETURNING id
    `
    const transactionId = txRows[0].id as string

    // Update payroll run
    await sql`
      UPDATE payroll_runs SET
        status = 'disbursed',
        transaction_id = ${transactionId},
        disbursed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${pr.id}
    `

    // Update account balance
    await sql`
      UPDATE accounts SET current_balance = current_balance - ${net} WHERE id = ${targetAccountId}
    `

    totalDisbursed += net
  }

  return NextResponse.json({
    ok: true,
    disbursed: pendingRows.length,
    totalPaid: totalDisbursed,
  }, { status: 201 })
}
