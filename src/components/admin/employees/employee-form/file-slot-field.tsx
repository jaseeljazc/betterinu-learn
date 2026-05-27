"use client"

import { useRef } from "react"
import { FileText, Eye, Loader2, CheckCircle2, X, Upload } from "lucide-react"

import { FileSlot, isImageFile, labelCls, ACCEPTED } from "./types"

type FileSlotFieldProps = {
  label: string
  required?: boolean
  slot: FileSlot | undefined
  onChange: (file: File | null) => void
}

function OptionalTag() {
  return <span className="text-xs font-normal text-muted ml-1">(optional)</span>
}

export function FileSlotField({
  label,
  required,
  slot,
  onChange,
}: FileSlotFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadStatus = slot?.status

  const hasFile = !!slot?.file
  const hasS3Key = !!slot?.s3Key
  const isUploaded = uploadStatus === "done"

  const objUrl = hasFile
    ? URL.createObjectURL(slot.file!)
    : (slot as any)?.presignedUrl || null
  const fileName = hasFile
    ? slot.file!.name
    : (slot as any)?.fileName || "Uploaded Document"
  const isImage = hasFile
    ? isImageFile(slot.file!)
    : /\.(jpg|jpeg|png)$/i.test((slot as any)?.fileName ?? "")

  return (
    <div className="space-y-1.5">
      <label className={labelCls}>
        {label}
        {required ? " *" : <OptionalTag />}
      </label>
      {hasFile || (hasS3Key && isUploaded) ? (
        <div className="rounded-md border border-default bg-elevated overflow-hidden">
          {/* Image preview strip */}
          {isImage && objUrl && (
            <div className="relative w-full h-28 bg-black/5 overflow-hidden border-b border-default">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={objUrl} alt={fileName} className="w-full h-full object-contain" />
            </div>
          )}
          {/* File info row */}
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <FileText className="size-4 text-muted shrink-0" />
            <span className="flex-1 truncate text-foreground">{fileName}</span>
            {objUrl && (
              <a
                href={objUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:opacity-70 transition-opacity"
                title="Preview"
              >
                <Eye className="size-4" />
              </a>
            )}
            {uploadStatus === "uploading" && (
              <Loader2 className="size-4 animate-spin text-primary shrink-0" />
            )}
            {uploadStatus === "done" && (
              <CheckCircle2 className="size-4 text-green-600 shrink-0" />
            )}
            {uploadStatus === "error" && (
              <span className="text-xs text-red-500 shrink-0">failed</span>
            )}
            {(!uploadStatus ||
              uploadStatus === "error" ||
              uploadStatus === "done") && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-muted hover:text-danger-500 transition-colors"
                title="Remove"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-md border border-dashed border-default bg-white px-3 py-2.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors w-full"
        >
          <Upload className="size-4 shrink-0" />
          Upload file (PDF, JPG, PNG · max 5 MB)
        </button>
      )}
      {slot?.error && <p className="text-xs text-danger-500">{slot.error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
