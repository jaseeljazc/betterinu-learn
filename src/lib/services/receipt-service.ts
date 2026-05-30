import fs from "fs"
import path from "path"
import { sql } from "@/lib/db"

export type ReceiptDetails = {
  receipt: {
    id: string
    amountPaid: number
    paymentDate: string
    paymentMode: string
    referenceNumber: string | null
    entryType: string
    recordedBy: string
    recordedByName?: string | null
    receiptNumber: string
    installmentNumber: number
    totalAmount: number
    paidAmount: number
    dueDate: string
    paymentType: string
    enrollmentId: string
    studentName: string
    studentId: string
    studentAddress: string | null
    studentPhone?: string | null
    courseName: string
    courseId: string
    oneTimePrice: number | null
    installmentTotalPrice: number | null
    defaultInstallmentCount: number | null
  }
  totalPaid: number
  nextInstallment: {
    installmentNumber: number
    totalAmount: number
    dueDate: string
  } | null
  logoBase64?: string
}

async function generateReceiptNumber(paymentLogId: string): Promise<string> {
  const currentYear = new Date().getFullYear()

  await sql`BEGIN`
  try {
    const refetch = await sql`
      SELECT receipt_number FROM student_payment_logs WHERE id = ${paymentLogId} FOR UPDATE
    `
    if (!refetch.length) {
      throw new Error(`Payment log ${paymentLogId} not found`)
    }

    let receiptNumber = refetch[0].receipt_number as string | null
    if (!receiptNumber) {
      const seqRow = await sql`
        SELECT COALESCE(
          MAX(CAST(SUBSTRING(receipt_number FROM 10) AS INTEGER)),
          0
        ) + 1 AS next_seq
        FROM student_payment_logs
        WHERE receipt_number LIKE ${`RCP-${currentYear}-%`}
      `
      const nextSeq = seqRow[0].next_seq
      const paddedSeq = String(nextSeq).padStart(5, "0")
      receiptNumber = `RCP-${currentYear}-${paddedSeq}`

      await sql`
        UPDATE student_payment_logs
        SET receipt_number = ${receiptNumber}
        WHERE id = ${paymentLogId}
      `
    }
    await sql`COMMIT`
    return receiptNumber
  } catch (e) {
    await sql`ROLLBACK`
    throw e
  }
}

export async function getReceiptDetails(paymentLogId: string): Promise<ReceiptDetails | null> {
  // 1. Fetch base payment log info
  const baseRows = await sql`
    SELECT
      spl.id,
      spl.amount_paid::float AS amount_paid,
      spl.payment_date::text AS payment_date,
      spl.payment_mode,
      spl.reference_number,
      spl.entry_type,
      spl.recorded_by,
      spl.receipt_number,
      si.installment_number,
      si.total_amount::float AS total_amount,
      si.paid_amount::float AS paid_amount,
      si.due_date::text AS due_date,
      sc.payment_type,
      sc.id AS enrollment_id,
      s.name AS student_name,
      s.id AS student_id,
      s.address AS student_address,
      COALESCE(s.phone, s.phone_number) AS student_phone,
      c.title AS course_name,
      c.id AS course_id,
      c.one_time_price::float AS one_time_price,
      c.installment_total_price::float AS installment_total_price,
      c.default_installment_count,
      aa.full_name AS recorded_by_name
    FROM student_payment_logs spl
    JOIN student_installments si ON si.id = spl.installment_id
    JOIN student_courses sc ON sc.id = spl.enrollment_id
    JOIN students s ON s.id = spl.student_id
    JOIN courses c ON c.id::text = sc.course_id
    LEFT JOIN admin_accounts aa ON aa.id = spl.recorded_by
    WHERE spl.id = ${paymentLogId}
    LIMIT 1
  `

  if (!baseRows.length) return null

  const row = baseRows[0]

  if (row.entry_type !== "payment") {
    throw new Error("Receipts are not generated for waiver or adjustment entries")
  }

  // Generate receipt number if null
  let receiptNumber = row.receipt_number as string | null
  if (!receiptNumber) {
    receiptNumber = await generateReceiptNumber(paymentLogId)
  }

  // 2. Fetch total paid so far
  const totalPaidRow = await sql`
    SELECT COALESCE(SUM(amount_paid), 0)::float AS total_paid
    FROM student_payment_logs
    WHERE enrollment_id = ${row.enrollment_id}
      AND entry_type = 'payment'
  `
  const totalPaid = totalPaidRow[0].total_paid as number

  // 3. Fetch next upcoming installment
  const nextRow = await sql`
    SELECT
      installment_number,
      total_amount::float AS total_amount,
      due_date::text AS due_date
    FROM student_installments
    WHERE enrollment_id = ${row.enrollment_id}
      AND status IN ('upcoming', 'overdue', 'partially_paid')
      AND installment_number > ${row.installment_number}
    ORDER BY installment_number ASC
    LIMIT 1
  `
  const nextInstallment = nextRow.length > 0 ? {
    installmentNumber: nextRow[0].installment_number as number,
    totalAmount: nextRow[0].total_amount as number,
    dueDate: nextRow[0].due_date as string
  } : null

  // 4. Load logo.png as base64
  let logoBase64 = ""
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    if (fs.existsSync(logoPath)) {
      logoBase64 = fs.readFileSync(logoPath, "base64")
    }
  } catch (err) {
    console.error("Failed to read logo.png for base64:", err)
  }

  return {
    receipt: {
      id: row.id as string,
      amountPaid: row.amount_paid as number,
      paymentDate: row.payment_date as string,
      paymentMode: row.payment_mode as string,
      referenceNumber: row.reference_number as string | null,
      entryType: row.entry_type as string,
      recordedBy: row.recorded_by as string,
      recordedByName: row.recorded_by_name as string | null,
      receiptNumber: receiptNumber as string,
      installmentNumber: row.installment_number as number,
      totalAmount: row.total_amount as number,
      paidAmount: row.paid_amount as number,
      dueDate: row.due_date as string,
      paymentType: row.payment_type as string,
      enrollmentId: row.enrollment_id as string,
      studentName: row.student_name as string,
      studentId: row.student_id as string,
      studentAddress: row.student_address as string | null,
      studentPhone: row.student_phone as string | null,
      courseName: row.course_name as string,
      courseId: row.course_id as string,
      oneTimePrice: row.one_time_price as number | null,
      installmentTotalPrice: row.installment_total_price as number | null,
      defaultInstallmentCount: row.default_installment_count as number | null,
    },
    totalPaid,
    nextInstallment,
    logoBase64,
  }
}
