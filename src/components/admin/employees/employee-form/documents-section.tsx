"use client"

import React from "react"
import { FileText, Eye, Loader2, CheckCircle2, X, Upload, Trash2, Plus } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileSlotField } from "./file-slot-field"
import {
  QUALIFICATION_LEVELS,
  Qualification,
  FileSlot,
  OtherDoc,
  isImageFile,
  labelCls,
  inputCls,
  ACCEPTED,
  MANDATORY_DOCS,
} from "./types"

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-default">
      <Icon className="size-4 text-primary" />
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

function OptionalTag() {
  return <span className="text-xs font-normal text-muted ml-1">(optional)</span>
}

type DocumentsSectionProps = {
  qualification: Qualification | ""
  setQualification: (val: Qualification) => void
  visibleCertSlots: { key: string; label: string; minQual: Qualification }[]
  certFiles: Record<string, FileSlot>
  handleCertFile: (key: string, file: File | null) => Promise<void>
  mandatoryFiles: Record<string, FileSlot>
  handleMandatoryFile: (key: string, file: File | null) => Promise<void>
  otherDocs: OtherDoc[]
  updateOtherDoc: (id: string, field: "name" | "file", value: string | File | null) => Promise<void>
  removeOtherDoc: (id: string) => Promise<void>
  addOtherDoc: () => void
}

export function DocumentsSection({
  qualification,
  setQualification,
  visibleCertSlots,
  certFiles,
  handleCertFile,
  mandatoryFiles,
  handleMandatoryFile,
  otherDocs,
  updateOtherDoc,
  removeOtherDoc,
  addOtherDoc,
}: DocumentsSectionProps) {
  return (
    <section className="rounded-md border border-default bg-white p-6 space-y-6">
      <SectionHeader icon={FileText} title="Documents" />
      <div className="max-w-xs">
        <label className={labelCls}>
          Highest Qualification<OptionalTag />
        </label>
        <Select value={qualification} onValueChange={(v) => setQualification(v as Qualification)}>
          <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
            <SelectValue placeholder="— Select Qualification —" />
          </SelectTrigger>
          <SelectContent>
            {QUALIFICATION_LEVELS.map((q) => (
              <SelectItem key={q} value={q}>
                {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleCertSlots.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Educational Certificates  
          </p> 
<div className={`grid grid-cols-1 gap-4 ${
  visibleCertSlots.length === 1 ? 'sm:grid-cols-1' :
  visibleCertSlots.length === 2 ? 'sm:grid-cols-2' :
  visibleCertSlots.length === 3 ? 'sm:grid-cols-3' :
  'sm:grid-cols-2'
}`}>            {visibleCertSlots.map((slot) => (
              <FileSlotField
                key={slot.key}
                label={slot.label}
                slot={certFiles[slot.key]}
                onChange={(f) => handleCertFile(slot.key, f)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Identity &amp; Banking Documents
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MANDATORY_DOCS.map((doc) => (
            <FileSlotField
              key={doc.key}
              label={doc.label}
              required
              slot={mandatoryFiles[doc.key]}
              onChange={(f) => handleMandatoryFile(doc.key, f)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          Other Documents
          <span className="text-xs font-normal normal-case ml-1 text-muted">(optional)</span>
        </p>
        <div className="space-y-3">
          {otherDocs.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-start rounded-md border border-default bg-elevated p-3"
            >
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Document Name
                </label>
                <input
                  value={doc.name}
                  onChange={(e) => updateOtherDoc(doc.id, "name", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Experience Certificate"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">File</label>
                {doc.file || (doc.s3Key && doc.status === "done") ? (
                  <div className="rounded-md border border-default bg-white overflow-hidden">
                    {/* Image preview for other docs */}
                    {(doc.file
                      ? isImageFile(doc.file)
                      : /\.(jpg|jpeg|png)$/i.test((doc as any).fileName ?? "")) && (
                      <div className="relative w-full h-24 bg-black/5 overflow-hidden border-b border-default">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            doc.file
                              ? URL.createObjectURL(doc.file)
                              : (doc as any).presignedUrl || ""
                          }
                          alt={doc.file ? doc.file.name : (doc as any).fileName || ""}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 h-10 px-3 text-sm">
                      <FileText className="size-4 text-muted shrink-0" />
                      <span className="flex-1 truncate text-foreground">
                        {doc.file ? doc.file.name : (doc as any).fileName || "Uploaded Document"}
                      </span>
                      {(doc.file ? URL.createObjectURL(doc.file) : (doc as any).presignedUrl) && (
                        <a
                          href={doc.file ? URL.createObjectURL(doc.file) : (doc as any).presignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:opacity-70 transition-opacity"
                          title="Preview"
                        >
                          <Eye className="size-4" />
                        </a>
                      )}
                      {doc.status === "uploading" && (
                        <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                      )}
                      {doc.status === "done" && (
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                      )}
                      {doc.status === "error" && (
                        <span className="text-xs text-red-500 shrink-0">failed</span>
                      )}
                      {(!doc.status || doc.status === "error" || doc.status === "done") && (
                        <button
                          type="button"
                          onClick={() => updateOtherDoc(doc.id, "file", null)}
                          className="text-muted hover:text-foreground transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 h-10 rounded-md border border-dashed border-default bg-white px-3 text-sm text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer">
                    <Upload className="size-4 shrink-0" />
                    <span>Upload file</span>
                    <input
                      type="file"
                      accept={ACCEPTED}
                      className="sr-only"
                      onChange={(e) =>
                        updateOtherDoc(doc.id, "file", e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                )}
                {doc.error && <p className="text-xs text-danger-500 mt-1">{doc.error}</p>}
              </div>
              <div className="flex items-end h-10">
                <button
                  type="button"
                  onClick={() => removeOtherDoc(doc.id)}
                  disabled={otherDocs.length === 1}
                  className="h-10 w-10 flex items-center justify-center rounded-md border border-default text-muted hover:text-danger-50 hover:border-danger-500 transition-colors disabled:opacity-30"
                  title="Remove row"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOtherDoc}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          <Plus className="size-4" /> Add Document
        </button>
      </div>
    </section>
  )
}
