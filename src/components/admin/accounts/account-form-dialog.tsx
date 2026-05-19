"use client";

import { AccountForm } from "./account-form";
import type { Account } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface AccountFormDialogProps {
  account?: Account;
  onClose: () => void;
  onSaved: () => void;
}

export function AccountFormDialog({ account, onClose, onSaved }: AccountFormDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-default bg-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-default shrink-0 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {account ? "Edit Account" : "New Account"}
          </h3>
          <button 
            onClick={onClose}
            type="button"
            className="p-1.5 text-secondary hover:bg-subtle rounded-lg transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <AccountForm account={account} onSuccess={onSaved} onCancel={onClose} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
