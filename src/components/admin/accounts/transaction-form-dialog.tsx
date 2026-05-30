"use client";

import { useRef } from "react";
import { TransactionForm } from "./transaction-form";
import { X } from "lucide-react";

interface TransactionFormDialogProps {
  transactionId?: string;
  initialData?: any;
  mode?: "create" | "edit";
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionFormDialog({
  transactionId,
  initialData,
  mode = "create",
  onClose,
  onSaved,
}: TransactionFormDialogProps) {
  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur- p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-md border border-default bg-white shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Fixed header */}
        <div className="px-6 py-4 border-b border-default shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {mode === "edit" ? "Edit Transaction" : "New Transaction"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-secondary hover:bg-subtle rounded-md transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 hover:[&::-webkit-scrollbar-thumb]:bg-black/25">
          <div className="p-6">
            <TransactionForm
              transactionId={transactionId}
              initialData={initialData}
              mode={mode}
              onSuccess={onSaved}
              onCancel={onClose}
              submitRef={submitRef}
              hideActions
            />
          </div>
        </div>

        {/* Fixed footer */}
        <div className="px-6 py-4 border-t border-default shrink-0 flex gap-3 bg-white rounded-b-md">
          <button
            type="button"
            onClick={() => submitRef.current?.click()}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            {mode === "edit" ? "Save Changes" : "Create Transaction"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-default px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
