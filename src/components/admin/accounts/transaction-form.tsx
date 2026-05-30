"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  Account,
  AccountCategory,
  AccountAttachment,
  TransactionType,
} from "@/types";
import { AttachmentUploader } from "./attachment-uploader";
import { AttachmentViewer } from "./attachment-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ── Fee-management types (inlined to avoid server import) ─────────────────────

type FeeStudent = {
  id: string
  fullName: string
  studentCode: string
  email: string
}

type FeeInstallment = {
  id: string
  installmentNumber: number
  dueDate: string
  totalAmount: number
  paidAmount: number
  remainingBalance: number
  status: string
}

type FeeEnrollment = {
  enrollmentId: string
  courseId: string
  courseTitle: string
  installments: FeeInstallment[]
}

const TX_STATUSES = [
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
];

interface TransactionFormProps {
  transactionId?: string;
  initialData?: Partial<{
    type: TransactionType;
    accountId: string;
    toAccountId: string;
    categoryId: string;
    amount: string;
    date: string;
    description: string;
    referenceNumber: string;
    status: string;
    attachments: AccountAttachment[];
    employeeId: string;
    employee?: { id: string; fullName: string; employeeCode: string };
  }>;
  mode?: "create" | "edit";
  onSuccess?: () => void;
  onCancel?: () => void;
  hideActions?: boolean;
  submitRef?: React.RefObject<HTMLButtonElement | null>;
}

export function TransactionForm({
  transactionId, initialData, mode = "create",
  onSuccess, onCancel,
  hideActions = false,
  submitRef,
}: TransactionFormProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [employees, setEmployees] = useState<{ id: string; fullName: string; employeeCode: string }[]>([]);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [type, setType] = useState<TransactionType>(
    initialData?.type ?? "expense",
  );
  const [accountId, setAccountId] = useState(initialData?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(
    initialData?.toAccountId ?? "",
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [amount, setAmount] = useState(initialData?.amount ?? "");
  const [date, setDate] = useState(
    initialData?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [referenceNumber, setReferenceNumber] = useState(
    initialData?.referenceNumber ?? "",
  );
  const [status, setStatus] = useState(initialData?.status ?? "confirmed");
  const [attachments, setAttachments] = useState<AccountAttachment[]>(
    initialData?.attachments ?? [],
  );
  const [employeeId, setEmployeeId] = useState(
    initialData?.employeeId ?? initialData?.employee?.id ?? "",
  );
  const [createdTxId, setCreatedTxId] = useState<string | null>(
    transactionId ?? null,
  );

  // ── Fee management state (cascading dropdowns) ────────────────────────────
  const [feeStudents, setFeeStudents] = useState<FeeStudent[]>([])
  const [feeStudentId, setFeeStudentId] = useState("")
  const [feeEnrollments, setFeeEnrollments] = useState<FeeEnrollment[]>([])
  const [feeEnrollmentId, setFeeEnrollmentId] = useState("")
  const [feeInstallmentId, setFeeInstallmentId] = useState("")
  const [paymentMode, setPaymentMode] = useState("cash")

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/accounts/accounts", { credentials: "include" }).then(
        (r) => r.json(),
      ),
      fetch("/api/admin/accounts/categories", { credentials: "include" }).then(
        (r) => r.json(),
      ),
      fetch("/api/admin/employees", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { employees: [] }))
        .catch(() => ({ employees: [] })),
    ]).then(([accountsData, catsData, employeesData]) => {
      setAccounts(
        (accountsData.accounts ?? []).filter((a: Account) => a.isActive),
      );
      setCategories(catsData.categories ?? []);
      setEmployees(employeesData.employees ?? []);
    });
  }, []);

  // Fetch enrolled students when a fee category is picked
  useEffect(() => {
    if (!isFeeCategory) { setFeeStudents([]); return }
    fetch("/api/admin/fee/enrolled-students", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFeeStudents(d.students ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // Fetch enrollments when a fee student is picked
  useEffect(() => {
    if (!feeStudentId) { setFeeEnrollments([]); setFeeEnrollmentId(""); setFeeInstallmentId(""); return }
    fetch(`/api/admin/fee/installments?studentId=${feeStudentId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFeeEnrollments(d.enrollments ?? []))
      .catch(() => {})
  }, [feeStudentId])

  const incomeCategories = categories.filter(
    (c) => c.type === "income" && !c.isArchived,
  );
  const expenseCategories = categories.filter(
    (c) => c.type === "expense" && !c.isArchived,
  );
  const currentCategories =
    type === "income" ? incomeCategories : expenseCategories;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isSalaryCategory = selectedCategory?.name?.toLowerCase().includes("salar") ?? false;
  const isFeeCategory = selectedCategory?.name?.toLowerCase().includes("fee") ?? false;

  // Derived fee selections
  const selectedEnrollment = feeEnrollments.find(
    (e) => e.enrollmentId === feeEnrollmentId,
  ) ?? null
  const feeInstallments = selectedEnrollment?.installments ?? []
  const selectedInstallment = feeInstallments.find(
    (i) => i.id === feeInstallmentId,
  ) ?? null

  const activeAccounts = accounts.filter((a) => a.isActive);
  const toAccounts = activeAccounts.filter((a) => a.id !== accountId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!accountId) {
      setError("Please select an account");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Amount must be positive");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }
    if (type === "transfer" && !toAccountId) {
      setError("Please select a destination account");
      return;
    }

    if (type === "expense" && isSalaryCategory && !employeeId) {
      setError("Please select an employee");
      return;
    }

    setSaving(true);
    const body = {
      type,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      categoryId: type !== "transfer" ? categoryId || undefined : undefined,
      amount: parseFloat(amount),
      date,
      description: isFeeCategory
        ? `Student fee payment — ${paymentMode}`
        : description,
      referenceNumber,
      status,
      employeeId: (type === "expense" && isSalaryCategory) ? (employeeId || null) : null,
      // Fee-specific fields
      studentId: isFeeCategory && feeStudentId ? feeStudentId : undefined,
      enrollmentId: isFeeCategory && feeEnrollmentId ? feeEnrollmentId : undefined,
      installmentId: isFeeCategory && feeInstallmentId ? feeInstallmentId : undefined,
      paymentMode: isFeeCategory ? paymentMode : undefined,
      // Pass s3Keys of pending attachments (uploaded before tx existed) so the API can link them
      pendingS3Keys: mode === "create"
        ? attachments.filter((a) => !a.transactionId || a.transactionId === "").map((a) => a.s3Key)
        : undefined,
    };

    const url =
      mode === "edit" && transactionId
        ? `/api/admin/accounts/transactions/${transactionId}`
        : "/api/admin/accounts/transactions";
    const method = mode === "edit" ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      
      if (mode === "create" && data.transactionId) {
        setCreatedTxId(data.transactionId);
      }
      
      // Show success toast
      toast.success(data.message || "Transaction saved successfully", {
        position: "top-right"
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/accounts/transactions");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  const TypeTab = ({
    value,
    label,
    color,
  }: {
    value: TransactionType;
    label: string;
    color: string;
  }) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`px-5 py-2.5 text-sm font-bold rounded-md transition-all ${type === value ? `${color} text-white shadow-sm` : "bg-subtle text-secondary hover:bg-default"}`}
    >
      {label}
    </button>
  );

  const FormSelect = ({
    value,
    onChange,
    placeholder,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    options: { value: string; label: string }[];
  }) =>
    mounted ? (
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
      >
        <SelectTrigger className="w-full h-[42px] bg-white rounded-md border-default px-4">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <div className="w-full h-[42px] rounded-md border border-default bg-white" />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Type tabs */}
      {mode === "create" && (
        <div className="flex gap-2">
          <TypeTab value="income" label="Income" color="bg-green-600" />
          <TypeTab value="expense" label="Expense" color="bg-red-600" />
          <TypeTab value="transfer" label="Transfer" color="bg-blue-600" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* From Account */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            {type === "transfer" ? "From Account *" : "Account *"}
          </label>
          <FormSelect
            value={accountId}
            onChange={setAccountId}
            placeholder="Select account"
            options={activeAccounts.map((a) => ({
              value: a.id,
              label: `${a.name} (${fmtBalance(a.currentBalance)})`,
            }))}
          />
        </div>

        {/* To Account (transfer only) */}
        {type === "transfer" ? (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
              To Account *
            </label>
            <FormSelect
              value={toAccountId}
              onChange={setToAccountId}
              placeholder="Select destination"
              options={toAccounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${fmtBalance(a.currentBalance)})`,
              }))}
            />
          </div>
        ) : (
          <>
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Category
              </label>
              <FormSelect
                value={categoryId}
                onChange={(v) => { setCategoryId(v); setFeeStudentId(""); setFeeEnrollmentId(""); setFeeInstallmentId(""); }}
                placeholder="Select category"
                options={currentCategories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </div>

            {/* Employee (only for expense of category salary) */}
            {type === "expense" && isSalaryCategory && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Employee *
                </label>
                <FormSelect
                  value={employeeId}
                  onChange={setEmployeeId}
                  placeholder="Select employee"
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.fullName} (${e.employeeCode})`,
                  }))}
                />
              </div>
            )}

            {/* Fee management cascading dropdowns */}
            {isFeeCategory && (
              <>
                {/* Student */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Student
                  </label>
                  <FormSelect
                    value={feeStudentId}
                    onChange={(v) => { setFeeStudentId(v); setFeeEnrollmentId(""); setFeeInstallmentId(""); }}
                    placeholder="Select student"
                    options={feeStudents.map((s) => ({
                      value: s.id,
                      label: `${s.fullName} (${s.studentCode})`,
                    }))}
                  />
                </div>

                {/* Enrollment / Course */}
                {feeStudentId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      Course Enrollment
                    </label>
                    <FormSelect
                      value={feeEnrollmentId}
                      onChange={(v) => { setFeeEnrollmentId(v); setFeeInstallmentId(""); }}
                      placeholder="Select course"
                      options={feeEnrollments.map((e) => ({
                        value: e.enrollmentId,
                        label: e.courseTitle,
                      }))}
                    />
                  </div>
                )}

                {/* Installment */}
                {feeEnrollmentId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">
                      Installment
                    </label>
                    <FormSelect
                      value={feeInstallmentId}
                      onChange={(v) => {
                        setFeeInstallmentId(v)
                        const inst = feeInstallments.find((i) => i.id === v)
                        if (inst) setAmount(inst.remainingBalance.toFixed(2))
                      }}
                      placeholder="Select installment"
                      options={feeInstallments.map((i) => ({
                        value: i.id,
                        label: `#${i.installmentNumber} — Due ${i.dueDate} · ₹${i.remainingBalance.toFixed(2)} remaining (${i.status})`,
                      }))}
                    />
                    {selectedInstallment && (
                      <p className="text-xs text-muted-foreground">
                        Total ₹{selectedInstallment.totalAmount.toFixed(2)} · Paid ₹{selectedInstallment.paidAmount.toFixed(2)} · Remaining ₹{selectedInstallment.remainingBalance.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Payment Mode 
                  </label>
                  <FormSelect
                    value={paymentMode}
                    onChange={setPaymentMode}
                    placeholder="Select mode"
                    options={[
                      { value: "cash", label: "Cash" },
                      { value: "upi", label: "UPI" },
                      { value: "bank_transfer", label: "Bank Transfer" },
                      { value: "cheque", label: "Cheque" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-secondary">
              ₹
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-default bg-white pl-8 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-11"
            required
          />
        </div>

        {/* Reference Number */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Reference Number
          </label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. INV-2024-001"
            className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Status
          </label>
          <FormSelect
            value={status}
            onChange={setStatus}
            placeholder="Status"
            options={TX_STATUSES}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">
          {type === "transfer" ? "Note" : "Description"}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={
            type === "transfer"
              ? "Optional transfer note"
              : "Optional description"
          }
          className="w-full rounded-md border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          {type === "transfer" ? "Transfer Slip" : "Attachments"}
        </label>
        {mode === "edit" && attachments.length > 0 && (
          <AttachmentViewer
            attachments={attachments}
            transactionId={createdTxId ?? ""}
            onDelete={(id) =>
              setAttachments((prev) => prev.filter((a) => a.id !== id))
            }
          />
        )}
        <AttachmentUploader
          transactionId={createdTxId}
          existingAttachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </div>

   {/* Submit — hidden when dialog controls the footer */}
{!hideActions && (
  <div className="flex gap-3 pt-2">
    <button
      type="submit"
      disabled={saving}
      className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
    >
      {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Transaction"}
    </button>
    <button
      type="button"
      onClick={() => onCancel ? onCancel() : router.back()}
      className="rounded-md border border-default px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
    >
      Cancel
    </button>
  </div>
)}

{/* Hidden real submit button — triggered by dialog footer via ref */}
<button ref={submitRef} type="submit" className="hidden" disabled={saving} />
    </form>
  );
}

function fmtBalance(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
