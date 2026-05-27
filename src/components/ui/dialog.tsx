"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay backdrop-blur- p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-md border border-default bg-elevated p-5 shadow-modal animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <Button aria-label="Close dialog" onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
