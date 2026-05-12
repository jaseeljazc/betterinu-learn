"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Paperclip, Trash2, UploadCloud, FileSpreadsheet } from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";

export interface AttachedFile {
  url: string;
  name: string;
  type: string;
  size?: number;
}

interface FileUploaderProps {
  /** Blob path prefix, e.g. "lessons/mod-abc123" */
  folder: string;
  /** Current attached files */
  files: AttachedFile[];
  onChange: (files: AttachedFile[]) => void;
  /** "admin" | "student" — determines which auth check the API uses */
  role?: "admin" | "student";
  multiple?: boolean;
}

const ACCEPTED = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.pptx,.xlsx,.txt";

function fileIcon(type: string = "") {
  if (type.startsWith("image/")) return <ImageIcon className="size-4 shrink-0 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="size-4 shrink-0 text-red-500" />;
  if (type.includes("spreadsheet") || type.includes("xlsx")) return <FileSpreadsheet className="size-4 shrink-0 text-green-600" />;
  return <Paperclip className="size-4 shrink-0 text-secondary" />;
}

export function FileUploader({
  folder,
  files,
  onChange,
  role = "admin",
  multiple = true,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function uploadFiles(fileList: FileList) {
    setError("");
    setUploading(true);
    const newFiles: AttachedFile[] = [];
    try {
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch(`/api/upload?role=${role}`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        newFiles.push({ url: data.url, name: data.name, type: data.type, size: data.size });
      }
      onChange([...files, ...newFiles]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    onChange(files.filter((_, i) => i !== index));
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
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-default bg-surface hover:border-primary/60 hover:bg-primary/5"
        }`}
      >
        {uploading ? (
          <RoboLoader size="sm" />
        ) : (
          <>
            <UploadCloud className="size-7 text-muted" />
            <p className="text-sm font-semibold text-secondary">
              Drag &amp; drop files, or <span className="text-primary underline">browse</span>
            </p>
            <p className="text-[11px] text-muted">Images, PDFs, DOCX, PPTX, XLSX, TXT</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-default bg-white px-3 py-2 text-sm"
            >
              {fileIcon(f.type)}
              <span className="flex-1 truncate text-foreground">{f.name}</span>
              {f.size && (
                <span className="text-[11px] text-muted shrink-0">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="shrink-0 text-muted hover:text-red-600 transition-colors"
                title="Remove file"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
