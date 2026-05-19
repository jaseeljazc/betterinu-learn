"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, AccountType } from "@/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash",           label: "Cash" },
  { value: "bank",           label: "Bank Account" },
  { value: "digital_wallet", label: "Digital Wallet" },
  { value: "petty_cash",     label: "Petty Cash" },
];

interface AccountFormProps {
  account?: Account;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const router = useRouter();
  const isEdit = !!account;

  const [name, setName]   = useState(account?.name ?? "");
  const [type, setType]   = useState<AccountType>(account?.type ?? "bank");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [ifscCode, setIfscCode] = useState(account?.ifscCode ?? "");
  const [openingBalance, setOpeningBalance] = useState(account?.openingBalance?.toString() ?? "0");
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const showAccountNumber = type === "bank" || type === "digital_wallet";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Account name is required"); return; }
    setSaving(true);

    const body = {
      name: name.trim(),
      type,
      accountNumber: showAccountNumber ? accountNumber.trim() : undefined,
      ifscCode: type === "bank" ? ifscCode.trim() : undefined,
      openingBalance: parseFloat(openingBalance) || 0,
      isActive,
    };

    const url = isEdit
      ? `/api/admin/accounts/accounts/${account.id}`
      : "/api/admin/accounts/accounts";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/accounts/accounts");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Account Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Account Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Main Operating Account"
          className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          required
        />
      </div>

      {/* Account Type */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Account Type *</label>
        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
          <SelectTrigger className="w-full h-[42px] bg-white rounded-xl border-default px-4">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account Number (conditional) */}
      {showAccountNumber && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Account Number</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={type === "digital_wallet" ? "e.g. +91 98765 43210" : "e.g. 1234567890"}
            className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      )}

      {/* IFSC Code (conditional) */}
      {type === "bank" && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">IFSC Code</label>
          <input
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            className="w-full rounded-xl border border-default bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors uppercase"
          />
        </div>
      )}

      {/* Opening Balance */}
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Opening Balance</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-secondary">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full rounded-xl border border-default bg-white pl-8 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <p className="text-[11px] text-muted">Opening balance cannot be changed after creation.</p>
        </div>
      )}

      {/* Status (edit only) */}
      {isEdit && (
        <div className="flex items-center justify-between rounded-xl border border-default bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Active</p>
            <p className="text-[11px] text-muted">Inactive accounts are hidden from transaction forms</p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isActive ? "bg-primary" : "bg-subtle"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isActive ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Account"}
        </button>
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="rounded-xl border border-default px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
