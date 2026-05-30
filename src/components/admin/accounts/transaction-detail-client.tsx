"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, RotateCcw, Pencil, Download, FileText, Paperclip, Trash2, ArrowLeft, X, ReceiptText } from "lucide-react";
import Link from "next/link";
import { TransactionForm } from "@/components/admin/accounts/transaction-form";
import { ReceiptModal } from "@/components/admin/students/student-detail/receipt-modal";
import type { AccountTransaction, AccountAttachment } from "@/types";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const TYPE_BADGE: Record<string, string> = {
  income: "bg-green-100 text-green-700 border-green-300",
  expense: "bg-red-100 text-red-700 border-red-300",
  transfer: "bg-blue-100 text-blue-700 border-blue-300",
};
const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-300",
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  void: "bg-muted/40 text-secondary border-default",
};
const AMOUNT_COLOR: Record<string, string> = {
  income: "text-green-700",
  expense: "text-red-600",
  transfer: "text-blue-700",
};

function isImageFile(name?: string | null, url?: string | null) {
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(name ?? url ?? "");
}

interface TransactionDetailPageClientProps {
  transactionId: string;
  canEdit: boolean;
}

export function TransactionDetailPageClient({ transactionId, canEdit }: TransactionDetailPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "1";
  const wantsVoid = searchParams.get("void") === "1";

  const [transaction, setTransaction] = useState<AccountTransaction | null>(null);
  const [attachments, setAttachments] = useState<AccountAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoidConfirm, setShowVoidConfirm] = useState(wantsVoid);
  const [voiding, setVoiding] = useState(false);
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/accounts/transactions/${transactionId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setTransaction(d.transaction);
        setAttachments(d.transaction?.attachments ?? []);
      })
      .finally(() => setLoading(false));
  }, [transactionId]);

  async function handleVoid() {
    setVoiding(true);
    try {
      await fetch(`/api/admin/accounts/transactions/${transactionId}/void`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/admin/accounts/transactions");
      router.refresh();
    } finally {
      setVoiding(false);
    }
  }

  async function handleRestore() {
    setVoiding(true);
    try {
      await fetch(`/api/admin/accounts/transactions/${transactionId}/void`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ restore: true }),
        headers: { "Content-Type": "application/json" },
      });
      router.refresh();
      window.location.reload();
    } finally {
      setVoiding(false);
    }
  }

  async function handleDeleteAttachment(id: string) {
    await fetch(`/api/admin/accounts/attachments/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <div className="py-20 text-center text-muted text-sm">Loading…</div>;
  if (!transaction) return <div className="py-20 text-center text-muted text-sm">Transaction not found.</div>;

  const isVoid = transaction.status === "void";

  if (isEditing && !isVoid) {
    return (
      <TransactionForm
        transactionId={transactionId}
        mode="edit"
        initialData={{
          type: transaction.type,
          accountId: transaction.account?.id,
          toAccountId: transaction.toAccount?.id,
          categoryId: transaction.category?.id,
          amount: String(transaction.amount),
          date: transaction.date,
          description: transaction.description,
          referenceNumber: transaction.referenceNumber,
          status: transaction.status,
          attachments,
          employeeId: transaction.employee?.id,
        }}
      />
    );
  }

  return (
    <div className="w-full">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between py-3 border-b border-default mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/accounts/transactions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary border border-default rounded-lg px-3 py-1.5 hover:text-primary hover:border-primary transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Transactions
          </Link>
          <span className="text-sm font-semibold text-foreground">
            Transaction #{transactionId.slice(-8).toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2">
          {transaction.paymentLogId && (
            <button
              onClick={() => setReceiptLogId(transaction.paymentLogId!)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-default rounded-lg px-3 py-1.5 text-secondary hover:text-primary hover:border-primary transition-colors"
            >
              <ReceiptText className="size-3" /> View Receipt
            </button>
          )}
          {canEdit && !isVoid && (
            <>
              <Link
                href={`/admin/accounts/transactions/${transactionId}?edit=1`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-default rounded-lg px-3 py-1.5 text-secondary hover:text-primary hover:border-primary transition-colors"
              >
                <Pencil className="size-3" /> Edit
              </Link>
              <button
                onClick={() => setShowVoidConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Ban className="size-3" /> Void
              </button>
            </>
          )}
          {canEdit && isVoid && (
            <button
              onClick={handleRestore}
              disabled={voiding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-green-200 bg-green-50 rounded-lg px-3 py-1.5 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="size-3" /> Restore
            </button>
          )}
        </div>
      </div>

      {/* ── Void confirm banner ── */}
      {showVoidConfirm && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700 mb-1">Void this transaction?</p>
          <p className="text-xs text-red-600 mb-3 leading-relaxed">
            Status will be set to void and account balances recalculated. Transaction data is preserved.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleVoid}
              disabled={voiding}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {voiding ? "Voiding…" : "Void Transaction"}
            </button>
            <button
              onClick={() => setShowVoidConfirm(false)}
              className="rounded-lg border border-default px-4 py-1.5 text-xs font-semibold text-secondary hover:bg-subtle"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 items-stretch">

        {/* ── Left: transaction detail card ── */}
        <div className="rounded-xl border border-default bg-white overflow-hidden flex flex-col">

          {/* Card header: badges only */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-subtle/50 border-b border-default flex-shrink-0">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${TYPE_BADGE[transaction.type]}`}>
              {transaction.type}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${STATUS_BADGE[transaction.status]}`}>
              {transaction.status}
            </span>
          </div>

          {/* Amount strip */}
          <div className="flex items-baseline gap-2 px-4 py-3 border-b border-default flex-shrink-0">
            <span className="text-lg text-muted font-medium">
              {transaction.type === "expense" ? "−" : "+"}
            </span>
            <span className={`text-3xl font-semibold tabular-nums ${AMOUNT_COLOR[transaction.type]}`}>
              {fmtCurrency(transaction.amount)}
            </span>
            <span className="text-sm text-muted font-medium">INR</span>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 divide-x divide-y divide-default flex-1">
            <div className="px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Date</p>
              <p className="text-sm font-medium text-foreground">{fmtDate(transaction.date)}</p>
            </div>

            <div className="px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Account</p>
              <p className="text-sm font-medium text-foreground">{transaction.account?.name ?? "—"}</p>
            </div>

            {transaction.toAccount && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">To Account</p>
                <p className="text-sm font-medium text-foreground">{transaction.toAccount.name}</p>
              </div>
            )}

            {transaction.category && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Category</p>
                <p className="text-sm font-medium text-foreground">{transaction.category.name}</p>
              </div>
            )}

            {transaction.employee && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Employee</p>
                <Link
                  href={`/admin/employees/${transaction.employee.id}`}
                  className="text-sm font-semibold text-primary hover:underline block truncate"
                >
                  {transaction.employee.fullName} ({transaction.employee.employeeCode})
                </Link>
              </div>
            )}

            {transaction.referenceNumber && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Reference #</p>
                <p className="text-sm font-mono font-medium text-foreground">{transaction.referenceNumber}</p>
              </div>
            )}

            {transaction.studentName && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Student / Fee Details</p>
                <Link
                  href={`/admin/students/${transaction.studentId}`}
                  className="text-sm font-semibold text-primary hover:underline block truncate"
                >
                  {transaction.studentName}
                </Link>
                {transaction.courseTitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {transaction.courseTitle}
                    {transaction.installmentNumber && ` (Installment #${transaction.installmentNumber})`}
                  </p>
                )}
              </div>
            )}

            {transaction.createdBy && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Created By</p>
                <p className="text-sm font-medium text-foreground">{transaction.createdBy.fullName}</p>
              </div>
            )}

            {transaction.createdAt && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Created At</p>
                <p className="text-sm font-medium text-foreground">{fmtDateTime(transaction.createdAt)}</p>
              </div>
            )}

            {transaction.description && (
              <div className="col-span-2 px-4 py-2.5" style={{ gridColumn: "1 / -1" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Description</p>
                <p className="text-sm font-medium text-foreground leading-relaxed">{transaction.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: attachments card ── */}
        <div className="rounded-xl border border-default bg-white overflow-hidden flex flex-col h-full">

          {/* Attachments header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-subtle/50 border-b border-default flex-shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Attachments</span>
            <span className="text-[11px] text-muted">
              {attachments.length} file{attachments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Empty state */}
          {attachments.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted py-8">
              <Paperclip className="size-6 opacity-30" />
              <p className="text-xs">No attachments</p>
            </div>
          )}

          {/* Attachment list */}
          {attachments.length > 0 && (
            <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-default">
              {attachments.map((a) => (
                <AttachmentCard
                  key={a.id}
                  a={a}
                  canEdit={canEdit}
                  onDelete={handleDeleteAttachment}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {receiptLogId && (
        <ReceiptModal
          open={!!receiptLogId}
          onClose={() => setReceiptLogId(null)}
          paymentLogId={receiptLogId}
        />
      )}
    </div>
  );
}

function AttachmentCard({ a, canEdit, onDelete }: { a: AccountAttachment, canEdit: boolean, onDelete: (id: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/accounts/attachments/${a.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ presignedUrl }) => setUrl(presignedUrl))
      .catch(() => setUrl(null));
  }, [a.id]);

  async function handleDownload() {
    try {
      const res = await fetch(`/api/admin/accounts/attachments/${a.id}?download=1`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const { presignedUrl } = await res.json();
      const link = document.createElement("a");
      link.href = presignedUrl;
      link.download = a.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Failed to download file.");
    }
  }

  const isImage = isImageFile(a.fileName);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Image preview */}
        {isImage && (
          <div className="flex-1 bg-subtle/40 border-b border-default flex items-center justify-center p-4 min-h-[120px]">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={a.fileName ?? "Attachment"}
                className="w-full h-full object-contain cursor-zoom-in transition-transform hover:scale-[1.02]"
                onClick={() => setIsModalOpen(true)}
              />
            ) : (
              <span className="text-[11px] text-muted animate-pulse">Loading preview...</span>
            )}
          </div>
        )}
        {/* File row (Image name & download section at the very bottom) */}
        <div className="flex items-center gap-3 px-4 py-2.5 mt-auto flex-shrink-0">
          {!isImage && <FileText className="size-4 text-muted flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{a.fileName ?? "File"}</p>
            {a.fileSize != null && (
              <p className="text-[11px] text-muted">
                {(a.fileSize / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="text-muted hover:text-primary transition-colors flex-shrink-0"
            aria-label="Download"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isModalOpen && url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur- animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setIsModalOpen(false)}
            aria-label="Close modal"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={a.fileName ?? "Attachment"}
            className="max-w-full max-h-full rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}