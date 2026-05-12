"use client";

import { Download, FileSpreadsheet, FileText, ImageIcon, Paperclip } from "lucide-react";

export interface AttachedFile {
  url: string;
  name: string;
  type: string;
}

interface FileViewerProps {
  files: AttachedFile[];
  title?: string;
}

function guessType(file: AttachedFile): string {
  if (file.type) return file.type;
  const ext = file.url?.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
  };
  return map[ext] ?? "";
}

function FileCard({ file }: { file: AttachedFile }) {
  const type = guessType(file);
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";
  const isSpreadsheet = type.includes("spreadsheet") || type.includes("xlsx");

  if (isImage) {
    return (
      <div className="rounded-xl border border-default overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.name}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="w-full max-h-96 object-contain bg-checkerboard"
          loading="lazy"
        />
        <div className="flex items-center gap-2 px-3 py-2 border-t border-default">
          <ImageIcon className="size-3.5 text-blue-500 shrink-0" />
          <span className="text-xs text-secondary truncate flex-1">{file.name}</span>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            download={file.name}
            className="text-xs font-bold text-primary hover:underline shrink-0"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="rounded-xl border border-default overflow-hidden bg-surface">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-default">
          <FileText className="size-5 text-red-500 shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-1 truncate">{file.name}</span>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shrink-0"
          >
            <FileText className="size-3.5" /> View PDF
          </a>
        </div>
      </div>
    );
  }

  // Generic doc / download
  const Icon = isSpreadsheet ? FileSpreadsheet : Paperclip;
  const iconCls = isSpreadsheet ? "text-green-600" : "text-secondary";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-default bg-surface px-4 py-3">
      <Icon className={`size-5 shrink-0 ${iconCls}`} />
      <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        download={file.name}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors shrink-0"
      >
        <Download className="size-3.5" /> Download
      </a>
    </div>
  );
}

export function FileViewer({ files, title = "Attachments" }: FileViewerProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{title}</p>
      <div className="space-y-3">
        {files.map((f, i) => (
          <FileCard key={i} file={f} />
        ))}
      </div>
    </div>
  );
}
