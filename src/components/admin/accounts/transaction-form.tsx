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
  const [createdTxId, setCreatedTxId] = useState<string | null>(
    transactionId ?? null,
  );

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
    ]).then(([accountsData, catsData]) => {
      setAccounts(
        (accountsData.accounts ?? []).filter((a: Account) => a.isActive),
      );
      setCategories(catsData.categories ?? []);
    });
  }, []);

  const incomeCategories = categories.filter(
    (c) => c.type === "income" && !c.isArchived,
  );
  const expenseCategories = categories.filter(
    (c) => c.type === "expense" && !c.isArchived,
  );
  const currentCategories =
    type === "income" ? incomeCategories : expenseCategories;

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

    setSaving(true);
    const body = {
      type,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      categoryId: type !== "transfer" ? categoryId || undefined : undefined,
      amount: parseFloat(amount),
      date,
      description,
      referenceNumber,
      status,
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
      className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${type === value ? `${color} text-white shadow-sm` : "bg-subtle text-secondary hover:bg-default"}`}
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
        <SelectTrigger className="w-full h-[42px] bg-white rounded-xl border-default px-4">
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
      <div className="w-full h-[42px] rounded-xl border border-default bg-white" />
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
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
          /* Category */
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground">
              Category
            </label>
            <FormSelect
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select category"
              options={currentCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>
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
              className="w-full rounded-xl border border-default bg-white pl-8 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-11"
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
            className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
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
      className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
    >
      {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Transaction"}
    </button>
    <button
      type="button"
      onClick={() => onCancel ? onCancel() : router.back()}
      className="rounded-xl border border-default px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
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
