"use client";

import { useState, useEffect } from "react";
import { FileText, Paperclip, Trash2, Download, Calendar, User, X, ZoomIn, Loader2 } from "lucide-react";
import type { AccountAttachment } from "@/types";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── Single attachment item ── */
function AttachmentItem({
  att,
  onDelete,
}: {
  att: AccountAttachment;
  onDelete?: (id: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(false);

  const isImage = att.fileType.startsWith("image/");
  const isPdf = att.fileType === "application/pdf";

  /* Auto-load image preview */
  useEffect(() => {
    if (!isImage) return;
    setLoadingPreview(true);
    fetch(`/api/admin/accounts/attachments/${att.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ presignedUrl }) => setPreviewUrl(presignedUrl))
      .catch(() => setPreviewUrl(null))
      .finally(() => setLoadingPreview(false));
  }, [att.id, isImage]);

  async function handleDownload() {
    setDownloadingId(true);
    try {
      const res = await fetch(`/api/admin/accounts/attachments/${att.id}?download=1`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const { presignedUrl } = await res.json();
      const a = document.createElement("a");
      a.href = presignedUrl;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert("Failed to download file.");
    } finally {
      setDownloadingId(false);
    }
  }

  async function handleOpenPdf() {
    try {
      const res = await fetch(`/api/admin/accounts/attachments/${att.id}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const { presignedUrl } = await res.json();
      window.open(presignedUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to open PDF.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/accounts/attachments/${att.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      onDelete?.(att.id);
    } catch {
      alert("Failed to delete attachment.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-default bg-subtle/40 overflow-hidden">
        {/* Image preview */}
        {isImage && (
          <div className="relative bg-gray-100 h-40 flex items-center justify-center">
            {loadingPreview ? (
              <Loader2 className="size-6 text-muted animate-spin" />
            ) : previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={att.fileName}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightboxUrl(previewUrl)}
                />
                <button
                  onClick={() => setLightboxUrl(previewUrl)}
                  className="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                  title="View full size"
                >
                  <ZoomIn className="size-3.5" />
                </button>
              </>
            ) : (
              <span className="text-xs text-muted">Preview unavailable</span>
            )}
          </div>
        )}

        {/* PDF placeholder */}
        {isPdf && (
          <button
            onClick={handleOpenPdf}
            className="w-full h-28 flex flex-col items-center justify-center gap-2 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <FileText className="size-8 text-red-500" />
            <span className="text-xs font-semibold text-red-600">Open PDF</span>
          </button>
        )}

        {/* Other file type */}
        {!isImage && !isPdf && (
          <div className="h-20 flex items-center justify-center bg-gray-50">
            <Paperclip className="size-7 text-secondary" />
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-2.5">
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-foreground font-medium truncate">Delete this file?</p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-default px-2.5 py-1 text-[11px] font-semibold text-secondary hover:bg-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-foreground truncate flex-1" title={att.fileName}>
                  {att.fileName}
                </span>
                <span className="text-[10px] text-muted shrink-0">{fmtSize(att.fileSize)}</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <Calendar className="size-2.5" />
                  {fmtDate(att.uploadedAt)}
                  {att.uploadedBy && (
                    <>
                      <User className="size-2.5 ml-1" />
                      {att.uploadedBy.fullName.split(" ")[0]}
                    </>
                  )}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleDownload}
                    disabled={downloadingId}
                    className="rounded-lg border border-default p-1 text-secondary hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    <Download className="size-3" />
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="rounded-lg border border-default p-1 text-secondary hover:border-red-300 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt={att.fileName}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/* ── Main viewer ── */
interface AttachmentViewerProps {
  attachments: AccountAttachment[];
  transactionId: string;
  onDelete?: (id: string) => void;
}

export function AttachmentViewer({ attachments, onDelete }: AttachmentViewerProps) {
  if (!attachments.length) {
    return (
      <p className="text-sm text-muted italic py-4 text-center">No attachments yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {attachments.map((att) => (
        <AttachmentItem key={att.id} att={att} onDelete={onDelete} />
      ))}
    </div>
  );
}
