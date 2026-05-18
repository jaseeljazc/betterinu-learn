"use client";

import { useRef, useState } from "react";
import {
  UploadCloud, FileText, ImageIcon, Paperclip, Trash2, AlertCircle,
  CheckCircle2, RotateCcw,
} from "lucide-react";
import type { AccountAttachment } from "@/types";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXT = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE = 10 * 1024 * 1024;

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="size-4 shrink-0 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="size-4 shrink-0 text-red-500" />;
  return <Paperclip className="size-4 shrink-0 text-secondary" />;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PendingAttachment {
  id: string; // temp local id
  fileName: string;
  fileType: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
  // On success, these are populated:
  s3Key?: string;
  attachmentId?: string;
}

interface AttachmentUploaderProps {
  transactionId: string | null;
  existingAttachments?: AccountAttachment[];
  onAttachmentsChange: (attachments: AccountAttachment[]) => void;
}

export function AttachmentUploader({
  transactionId,
  existingAttachments = [],
  onAttachmentsChange,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);

  async function uploadFile(file: File) {
    const tempId = `tmp-${Date.now()}-${Math.random()}`;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setPending((p) => [
        ...p,
        { id: tempId, fileName: file.name, fileType: file.type, fileSize: file.size, progress: 0, status: "error", error: "File type not allowed. Use JPEG, PNG, WEBP, or PDF." },
      ]);
      return;
    }
    if (file.size > MAX_SIZE) {
      setPending((p) => [
        ...p,
        { id: tempId, fileName: file.name, fileType: file.type, fileSize: file.size, progress: 0, status: "error", error: "File exceeds 10 MB limit." },
      ]);
      return;
    }

    // Add pending entry
    setPending((p) => [
      ...p,
      { id: tempId, fileName: file.name, fileType: file.type, fileSize: file.size, progress: 0, status: "uploading" },
    ]);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch("/api/admin/accounts/attachments/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transactionId: transactionId ?? null,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      if (!presignRes.ok) {
        const d = await presignRes.json();
        throw new Error(d.error ?? "Failed to get upload URL");
      }
      const { presignedUrl, s3Key } = await presignRes.json();

      // Step 2: PUT directly to S3
      // Using fetch with redirect:'error' so that any 301 redirect (which browsers
      // silently downgrade to GET) causes an explicit failure instead of a signature mismatch.
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
        redirect: "error", // Never follow redirects — they change PUT→GET
        mode: "cors",
      });

      // Simulate progress as a single jump to 95% on complete
      setPending((p) => p.map((x) => (x.id === tempId ? { ...x, progress: 95 } : x)));

      if (!uploadRes.ok && uploadRes.status !== 0) {
        throw new Error(`S3 upload failed: HTTP ${uploadRes.status}`);
      }

      // Step 3: Confirm upload
      const confirmRes = await fetch("/api/admin/accounts/attachments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          transactionId: transactionId ?? null,
          s3Key, fileName: file.name, fileType: file.type, fileSize: file.size,
        }),
      });
      if (!confirmRes.ok) {
        const d = await confirmRes.json();
        throw new Error(d.error ?? "Failed to confirm upload");
      }
      const { attachmentId } = await confirmRes.json();

      // Update pending entry to success
      setPending((p) =>
        p.map((x) => (x.id === tempId ? { ...x, progress: 100, status: "success", s3Key, attachmentId } : x))
      );

      // Notify parent
      const newAtt: AccountAttachment = {
        id: attachmentId,
        transactionId: transactionId ?? "",
        s3Key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };
      onAttachmentsChange([...existingAttachments, newAtt]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setPending((p) =>
        p.map((x) => (x.id === tempId ? { ...x, status: "error", error: msg } : x))
      );
    }
  }

  function handleFiles(files: FileList) {
    Array.from(files).forEach(uploadFile);
    if (inputRef.current) inputRef.current.value = "";
  }

  function retryFile(item: PendingAttachment) {
    setPending((p) => p.filter((x) => x.id !== item.id));
    // Re-open file picker would require a new File object which we don't have
    // so just remove the error entry and let user re-pick
  }

  function removePending(id: string) {
    setPending((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-default bg-surface hover:border-primary/60 hover:bg-primary/5"
        }`}
      >
        <UploadCloud className="size-7 text-muted" />
        <p className="text-sm font-semibold text-secondary">
          Drag & drop files, or <span className="text-primary underline">browse</span>
        </p>
        <p className="text-[11px] text-muted">JPEG, PNG, WEBP, PDF — max 10 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXT}
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Pending uploads */}
      {pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((item) => (
            <li key={item.id} className="rounded-xl border border-default bg-white p-3">
              <div className="flex items-center gap-2">
                {fileIcon(item.fileType)}
                <span className="flex-1 truncate text-sm text-foreground">{item.fileName}</span>
                <span className="text-[11px] text-muted shrink-0">{fmtSize(item.fileSize)}</span>
                {item.status === "success" && <CheckCircle2 className="size-4 text-green-600 shrink-0" />}
                {item.status === "error" && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => retryFile(item)} className="text-muted hover:text-primary" title="Retry">
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button onClick={() => removePending(item.id)} className="text-muted hover:text-red-600" title="Remove">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
                {item.status === "uploading" && (
                  <button onClick={() => removePending(item.id)} className="text-muted hover:text-red-600 shrink-0">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {item.status === "uploading" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.status === "error" && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-600">
                  <AlertCircle className="size-3 shrink-0" />
                  {item.error}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
