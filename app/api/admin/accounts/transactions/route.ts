import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { recordFeePayment } from "@/lib/fee-payment";

// ── GET /api/admin/accounts/transactions ─────────────────────────
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "accounts", "view");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const studentSearch = searchParams.get("studentSearch");

  const rows = await sql`
    SELECT
      t.id, t.type, t.amount, t.date::text AS date, t.description,
      t.reference_number, t.status,
      t.voided_at::text AS voided_at, t.created_at::text AS created_at,
      a.id AS acc_id, a.name AS acc_name, a.type AS acc_type,
      ta.id AS to_acc_id, ta.name AS to_acc_name, ta.type AS to_acc_type,
      c.id AS cat_id, c.name AS cat_name, c.type AS cat_type,
      c.color AS cat_color, c.icon AS cat_icon,
      aa.id AS cb_id, aa.full_name AS cb_name,
      t.employee_id, emp.full_name AS employee_name, emp.employee_code AS employee_code,
      t.student_id, st.name AS student_name,
      t.enrollment_id,
      t.installment_id, si.installment_number,
      co.title AS course_title,
      (SELECT COUNT(*) FROM account_attachments att WHERE att.transaction_id = t.id) AS attachment_count,
      (
        SELECT spl.id
        FROM student_payment_logs spl
        WHERE spl.installment_id = t.installment_id
          AND spl.student_id = t.student_id
          AND spl.amount_paid = t.amount
          AND spl.entry_type = 'payment'
        LIMIT 1
      ) AS payment_log_id
    FROM account_transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    LEFT JOIN account_categories c ON c.id = t.category_id
    LEFT JOIN admin_accounts aa ON aa.id = t.created_by
    LEFT JOIN employees emp ON emp.id = t.employee_id
    LEFT JOIN students st ON st.id = t.student_id
    LEFT JOIN student_installments si ON si.id = t.installment_id
    LEFT JOIN student_courses sc ON sc.id = t.enrollment_id
    LEFT JOIN courses co ON co.id::text = sc.course_id
    WHERE 1=1
      ${type ? sql`AND t.type = ${type}` : sql``}
      ${accountId ? sql`AND (t.account_id = ${accountId} OR t.to_account_id = ${accountId})` : sql``}
      ${categoryId ? sql`AND t.category_id = ${categoryId}` : sql``}
      ${status ? sql`AND t.status = ${status}` : sql``}
      ${startDate ? sql`AND t.date >= ${startDate}` : sql``}
      ${endDate ? sql`AND t.date <= ${endDate}` : sql``}
      ${search ? sql`AND (t.description ILIKE ${`%${search}%`} OR t.reference_number ILIKE ${`%${search}%`})` : sql``}
      ${studentSearch ? sql`AND st.name ILIKE ${`%${studentSearch}%`}` : sql``}
    ORDER BY t.date DESC, t.created_at DESC
  `;

  const transactions = rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: parseFloat(r.amount as string),
    date: r.date,
    description: r.description,
    referenceNumber: r.reference_number,
    status: r.status,
    voidedAt: r.voided_at,
    createdAt: r.created_at,
    attachmentCount: parseInt(r.attachment_count as string),
    account: r.acc_id ? { id: r.acc_id, name: r.acc_name, type: r.acc_type } : null,
    toAccount: r.to_acc_id ? { id: r.to_acc_id, name: r.to_acc_name, type: r.to_acc_type } : null,
    category: r.cat_id
      ? { id: r.cat_id, name: r.cat_name, type: r.cat_type, color: r.cat_color, icon: r.cat_icon }
      : null,
    employee: r.employee_id
      ? { id: r.employee_id, fullName: r.employee_name, employeeCode: r.employee_code }
      : null,
    createdBy: r.cb_id ? { id: r.cb_id, fullName: r.cb_name } : null,
    // Student-fee fields (present only when student_id is set)
    studentId: (r.student_id as string | null) ?? null,
    studentName: (r.student_name as string | null) ?? null,
    installmentId: (r.installment_id as string | null) ?? null,
    installmentNumber: (r.installment_number as number | null) ?? null,
    courseTitle: (r.course_title as string | null) ?? null,
    paymentLogId: (r.payment_log_id as string | null) ?? null,
  }));

  return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}


// Helper: recalculate and update current_balance for an account (atomic)
async function recalcBalance(accountId: string) {
  await sql`
    UPDATE accounts
    SET current_balance = (
      SELECT opening_balance FROM accounts WHERE id = ${accountId}
    ) + COALESCE((
      SELECT SUM(
        CASE
          WHEN type = 'income' THEN amount
          WHEN type = 'transfer' AND to_account_id = ${accountId} THEN amount
          WHEN type = 'expense' THEN -amount
          WHEN type = 'transfer' AND account_id = ${accountId} THEN -amount
          ELSE 0
        END
      )
      FROM account_transactions
      WHERE (account_id = ${accountId} OR to_account_id = ${accountId})
        AND status != 'void'
    ), 0)
    WHERE id = ${accountId}
  `;
}

// ── POST /api/admin/accounts/transactions ────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const {
    type, accountId, toAccountId, categoryId,
    amount, date, description, referenceNumber,
    status = "confirmed",
    pendingS3Keys,
    employeeId,
    // Fee-management fields (optional — only sent from the financial panel fee flow)
    studentId,
    enrollmentId,
    installmentId,
    paymentMode,
  } = body;

  if (!["income", "expense", "transfer"].includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }
  if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (type === "transfer" && !toAccountId) {
    return NextResponse.json({ error: "toAccountId is required for transfers" }, { status: 400 });
  }

  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId;

  // ── Fee flow: delegate to recordFeePayment when all fee fields are present ──
  if (installmentId && studentId && enrollmentId) {
    const validModes = ["cash", "upi", "bank_transfer", "cheque", "other"];
    if (!validModes.includes(paymentMode)) {
      return NextResponse.json({ error: "Invalid payment mode for fee transaction" }, { status: 400 });
    }
    try {
      const result = await recordFeePayment({
        installmentId,
        studentId,
        enrollmentId,
        amount: Number(amount),
        paymentDate: date,
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: null,
        accountId,
        categoryId: categoryId || null,
        adminId: adminId ?? "",
      });
      return NextResponse.json({
        ok: true,
        transactionId: result.transactionId,
        message: result.overpayment > 0
          ? `Payment recorded. Overpayment of ₹${result.overpayment.toFixed(2)} noted.`
          : "Fee payment recorded successfully.",
      }, { status: 201 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  // ── Normal transaction flow ──────────────────────────────────────────────────
  const rows = await sql`
    INSERT INTO account_transactions (
      type, account_id, to_account_id, category_id,
      amount, date, description, reference_number,
      status, created_by, employee_id
    ) VALUES (
      ${type}, ${accountId}, ${toAccountId || null}, ${categoryId || null},
      ${amount}, ${date}, ${description || null}, ${referenceNumber || null},
      ${status}, ${adminId}, ${employeeId || null}
    )
    RETURNING id
  `;

  const transactionId = rows[0].id as string;

  // Recalculate balances
  await recalcBalance(accountId);
  if (toAccountId) await recalcBalance(toAccountId);

  // Link any pending attachments (uploaded before the transaction existed)
  if (Array.isArray(pendingS3Keys) && pendingS3Keys.length > 0) {
    for (const s3Key of pendingS3Keys) {
      await sql`
        UPDATE account_attachments
        SET transaction_id = ${transactionId}
        WHERE s3_key = ${s3Key} AND transaction_id IS NULL
      `;
    }
  }

  await sql`
    INSERT INTO account_audit_log (entity_type, entity_id, action, changed_by, changes)
    VALUES ('transaction', ${transactionId}, 'created', ${adminId}, ${JSON.stringify({ type, amount, date })})
  `;

  return NextResponse.json({ 
    ok: true, 
    transactionId, 
    message: "Transaction created successfully" 
  }, { status: 201 });
}