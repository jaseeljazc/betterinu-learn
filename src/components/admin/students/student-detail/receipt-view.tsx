"use client"

import { Card } from "@/components/ui/card"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })
  } catch {
    return "—"
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₹0.00"
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  )
}

function fmtMode(mode: string) {
  const MAP: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    other: "Other",
  }
  return MAP[mode] ?? mode
}

const INST_ENV = {
  name: process.env.NEXT_PUBLIC_INSTITUTION_NAME || "Betterinu IT HUB",
  address: process.env.NEXT_PUBLIC_INSTITUTION_ADDRESS || "30/264-13,14 | Near Moosakutty Bus Stand| Bypass Road Perinthalmanna| Malappuram Kerala 679322",
  phone: process.env.NEXT_PUBLIC_INSTITUTION_PHONE || "+91 81388 02562",
  email: process.env.NEXT_PUBLIC_INSTITUTION_EMAIL || "contact@betterinu.com",
}

type ReceiptViewProps = {
  data: {
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
  }
}

// ── Field Row Helper ─────────────────────────────────────────────────────────

function Field({
  label,
  value,
  bold = false,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex px-2 py-1.5 text-[13px] leading-normal">
      <span className="font-bold text-[#1a1a1a] w-[90px] shrink-0">{label}</span>
      <span className="text-[#1a1a1a] mr-1 shrink-0">:</span>
      <span className={`${bold ? "font-bold" : ""} text-[#1a1a1a] flex-1 break-words`}>
        {value}
      </span>
    </div>
  )
}

export function ReceiptView({ data }: ReceiptViewProps) {
  const { receipt, totalPaid, nextInstallment } = data
  const isOneTime = receipt.paymentType === "one_time"
  const courseFee = isOneTime ? (receipt.oneTimePrice ?? 0) : (receipt.installmentTotalPrice ?? 0)
  const balance = courseFee - totalPaid
  const studentAddressLines = (receipt.studentAddress || "").split("\n")

  return (
    <div className="flex flex-col gap-6 min-h-0 min-w-0">
      {/* Dynamic print stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 48pt;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* Printable Card Area */}
      <Card id="receipt-print-area" className="rounded-md border border-border shadow-none bg-white p-12 flex flex-col gap-6 max-w-[180mm] mx-auto w-full">

        <div className="flex justify-between items-start gap-6 mb-3">
          <div className="flex items-center -mt-6 shrink-0">
            <img
              src="/new-logo.svg"
              alt="logo"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png"
              }}
            />
          </div>

          <div className="flex-1 text-right pb-3 font-semibold">
            <div className="relative w-full h-[3px]  bg-[#067635] mb-2">
              <div className="absolute right-0 top-[-0.5] h-[4px]  w-1/4 bg-black" />
            </div>
            <h2 className="text-[13.5px] font-bold text-[#1a1a1a] tracking-tight mb-2">{INST_ENV.name.toUpperCase()}</h2>
            {INST_ENV.address.split("|").map((part, i) => (
              <p key={i} className="text-[12px] text-[#444444] leading-[1.5]">
                {part.trim()}
              </p>
            ))}
            <p className="text-[12px] text-[#444444] leading-[1.5]">{INST_ENV.phone}</p>
            <p className="text-[12px] text-[#053a85] leading-[1.5]">{INST_ENV.email}</p>
          </div>
        </div>

        {/* Title */}
        <div className="flex justify-center ">
          <h1 className="text-[18px] font-bold text-[#067635] underline tracking-[1.5px] uppercase">FEE RECEIPT</h1>
        </div>

        {/* Main Info Table */}
        <div className="border border-[#555555] bg-white flex flex-col w-full">

          {/* Row 1: Receipt No | Course No */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Receipt No" value={receipt.receiptNumber ?? "—"} />
            </div>
            <div className="flex-1">
              <Field label="Course No" value={receipt.courseId ?? "—"} />
            </div>
          </div>

          {/* Row 2: Received From | Fees */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Received From" value={receipt.studentName ?? "—"} />
            </div>
            <div className="flex-1">
              <Field label="Fees" value={formatCurrency(courseFee)} bold />
            </div>
          </div>

          {/* Row 3: Address | Course Name */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <div className="flex px-2 py-1.5 text-[13px] leading-normal">
                <span className="font-bold text-[#1a1a1a] w-[90px] shrink-0">Address</span>
                <span className="text-[#1a1a1a] mr-1 shrink-0">:</span>
                <div className="flex-1 flex flex-col text-[#1a1a1a] break-words">
                  {studentAddressLines.map((line: string, i: number) => (
                    <span key={i}>{line}</span>
                  ))}
                  {receipt.studentPhone ? (
                    <span>{receipt.studentPhone}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <Field label="Course Name" value={receipt.courseName ?? "—"} />
            </div>
          </div>

          {/* Row 4: Installment Date | Total Paid */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Installment Date" value={formatDate(receipt.dueDate)} />
            </div>
            <div className="flex-1">
              <Field label="Total Paid" value={formatCurrency(totalPaid)} bold />
            </div>
          </div>

          {/* Row 5: Payment Date | Balance */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Payment Date" value={formatDate(receipt.paymentDate)} />
            </div>
            <div className="flex-1">
              <Field label="Balance" value={formatCurrency(balance)} bold />
            </div>
          </div>

          {/* Row 6: Amount Received | Next Installment */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Amount Received" value={formatCurrency(receipt.amountPaid)} bold />
            </div>
            <div className="flex-1">
              {nextInstallment && !isOneTime ? (
                <Field label="Next Installment" value={formatCurrency(nextInstallment.totalAmount)} bold />
              ) : (
                <Field label="Next Installment" value="—" />
              )}
            </div>
          </div>

          {/* Row 7: Payment Method | Due Date */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Payment Method" value={fmtMode(receipt.paymentMode)} />
            </div>
            <div className="flex-1">
              {nextInstallment && !isOneTime ? (
                <Field label="Due Date" value={formatDate(nextInstallment.dueDate)} />
              ) : (
                <Field label="Due Date" value="—" />
              )}
            </div>
          </div>

          {/* Row 8: Transaction ID | (empty) */}
          <div className="flex">
            <div className="flex-1 border-r border-[#555555]">
              <Field label="Transaction ID" value={receipt.referenceNumber ?? "—"} />
            </div>
            <div className="flex-1">
              {/* empty cell */}
            </div>
          </div>

        </div>

        {/* Signatures Section */}
        <div className="flex flex-row justify-between items-start mt-6 mb-10 px-2 text-[10.5px]">
          {/* Left: Student/Parent */}
          <div className="w-[200px] flex flex-col">
            <span className="text-[#1a1a1a] mb-1">
              Student/Parent Name: {receipt.studentName ?? ""}
            </span>
            <div className="mt-2 flex items-end">
              <span className="text-[#1a1a1a]">Signature</span>
              <div className="w-[150px] border-b border-[#555555] ml-2 mb-1" />
            </div>
          </div>

          {/* Right: Authorised Signatory */}
          <div className="w-[200px] flex flex-col items-end text-right">
            <span className="font-bold text-[#1a1a1a] mb-14">Authorised Signatory:</span>
            <div className="w-full border-t border-[#555555] pt-1">
              <p className="text-[9.5px] text-[#555555] text-center">
                For {INST_ENV.name}
              </p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t border-[#cccccc] pt-2 text-[12px] font-semibold text-[#333333] space-y-1">
          <p className="font-bold text-[#067635] text-xl underline pb-2">Terms and conditions</p>
          <p className="leading-relaxed">
            1. This receipt is issued subject to realization of cheque and/or confirmation of payment from the respective bank, payment gateway, or payment method used.
          </p>
          <p className="leading-relaxed">
            2. This receipt must be carefully preserved and produced upon request for any verification, refund processing, or account-related clarification.
          </p>
          <p className="leading-relaxed">
            3. Fees once paid are strictly non-refundable and non-transferable under any circumstances, except where the Second Party is eligible for refund under the officially defined fumigation period of one (1) month, subject to fulfilment of all conditions specified in the Agreement.
          </p>
          <p className="leading-relaxed">
            4. Failure to adhere to the agreed payment schedule may result in suspension or restriction of access to classes, facilities, mentorship, assessments, and other services until all dues are cleared.
          </p>
          <p className="leading-relaxed">
            5. The balance amount mentioned shall be payable as per the agreed schedule, and the student shall remain liable to pay the full course fee irrespective of course completion, withdrawal, or termination.
          </p>
          <p className="leading-relaxed">
            6. Any discrepancy in payment details must be reported within three (3) days from the date of receipt, failing which the records maintained by the institution shall be treated as final and binding.
          </p>
        </div>

      </Card>
    </div>
  )
}
