import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  title,
  children,
  onClose,
  size = "md",
  scrollable = true,
  headerActions,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
  scrollable?: boolean;
  headerActions?: ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col rounded-md border border-default bg-elevated p-5 shadow-modal animate-in zoom-in-95 duration-200`}>
        <div className="mb-4 flex items-center justify-between gap-4 shrink-0">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions && <div className="flex items-center gap-2 mr-2 no-print">{headerActions}</div>}
            <Button aria-label="Close dialog" onClick={onClose} size="icon" type="button" variant="ghost">
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className={cn("flex-1 min-h-0", scrollable ? "overflow-y-auto pr-1" : "flex flex-col")}>
          {children}
        </div>
      </div>
    </div>
  );
}
