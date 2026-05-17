"use client";

import { ClipboardList, Lock, Plus, Trash2, Link2, FileUp, ImageIcon } from "lucide-react";
import type { AssignmentSubModuleData } from "@/types";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FileUploader } from "@/components/ui/FileUploader";
import type { AttachedFile } from "@/components/ui/FileUploader";

interface AssignmentModuleEditorProps {
  moduleId: string;
  assignmentData: AssignmentSubModuleData;
  onChange: (data: AssignmentSubModuleData) => void;
  hideTitle?: boolean;
}

const SUBMISSION_TYPES: { key: "text" | "file" | "image" | "url"; label: string; desc: string }[] = [
  { key: "text",  label: "Text Response", desc: "Student types an answer" },
  { key: "file",  label: "File Upload",   desc: "PDF, DOCX, ZIP, etc." },
  { key: "image", label: "Image Upload",  desc: "PNG, JPG, WEBP" },
  { key: "url",   label: "URL / Link",    desc: "GitHub, live sites, etc." },
];

export function AssignmentModuleEditor({ moduleId, assignmentData, onChange, hideTitle = false }: AssignmentModuleEditorProps) {
  const data: AssignmentSubModuleData = assignmentData || {
    title: "",
    instructions: "",
    dueDate: "",
    totalMarks: undefined,
    allowedSubmissionTypes: ["text"],
    requiresApproval: true,
    attachedFiles: [],
    referenceLinks: [],
  };

  function patch(fields: Partial<AssignmentSubModuleData>) {
    onChange({ ...data, ...fields });
  }

  function toggleSubmissionType(type: "text" | "file" | "image" | "url") {
    const current = data.allowedSubmissionTypes || [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (next.length > 0) patch({ allowedSubmissionTypes: next });
  }

  // Reference links management
  const links = data.referenceLinks || [];
  function addLink() {
    patch({ referenceLinks: [...links, { label: "", url: "" }] });
  }
  function updateLink(idx: number, field: "label" | "url", value: string) {
    const next = links.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    patch({ referenceLinks: next });
  }
  function removeLink(idx: number) {
    patch({ referenceLinks: links.filter((_, i) => i !== idx) });
  }

  // Attached files
  const attachedFiles: AttachedFile[] = (data.attachedFiles as AttachedFile[]) || [];

  const inputCls = "w-full rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors";
  const labelCls = "block text-[9px] font-bold uppercase tracking-widest text-muted mb-1";
  const sectionCls = "space-y-3 border-b border-default pb-5";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-default">
        <div className="flex size-8 items-center justify-center rounded-lg bg-orange-100">
          <ClipboardList className="size-4 text-orange-700" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700">Assignment Editor</p>
          <p className="text-[10px] text-muted">Configure this assignment for students</p>
        </div>
      </div>

      {/* Title */}
      {!hideTitle && (
        <div className={sectionCls}>
          <label className={labelCls}>Assignment Title</label>
          <input
            className={inputCls}
            value={data.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="e.g. Build a Todo App"
          />
        </div>
      )}

      {/* Instructions */}
      <div className={sectionCls}>
        <label className={labelCls}>Instructions</label>
        <div className="bg-white rounded-lg border border-default">
          <RichTextEditor
            value={data.instructions}
            onChange={(v) => patch({ instructions: v })}
            placeholder="Describe what students need to do..."
          />
        </div>
      </div>

      {/* Due Date + Marks */}
      <div className={`grid grid-cols-2 gap-3 ${sectionCls}`}>
        <div>
          <label className={labelCls}>Due Date (Optional)</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={data.dueDate || ""}
            onChange={(e) => patch({ dueDate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Total Marks (Optional)</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={data.totalMarks ?? ""}
            onChange={(e) => patch({ totalMarks: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="e.g. 100"
          />
        </div>
      </div>

      {/* Admin File Attachments */}
      <div className={sectionCls}>
        <label className={labelCls}>Reference Files & Images</label>
        <p className="text-[10px] text-muted mb-2">Upload multiple PDFs, images, or other files students can download or view.</p>
        <FileUploader
          folder={`assignments/${moduleId}/resources`}
          files={attachedFiles}
          onChange={(files) => patch({ attachedFiles: files })}
          role="admin"
        />
      </div>

      {/* Reference Links */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Reference Links</label>
          <button
            type="button"
            onClick={addLink}
            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
          >
            <Plus className="size-3" /> Add Link
          </button>
        </div>
        {links.length === 0 && (
          <p className="text-[10px] text-muted italic">No links yet. Click "Add Link" to add reference URLs.</p>
        )}
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <input
                  className={`${inputCls} py-1.5`}
                  value={link.label}
                  onChange={(e) => updateLink(idx, "label", e.target.value)}
                  placeholder="Label (e.g. MDN Docs)"
                />
                <input
                  className={`${inputCls} py-1.5`}
                  value={link.url}
                  onChange={(e) => updateLink(idx, "url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="shrink-0 text-muted hover:text-red-500 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Allowed Submission Types */}
      <div className={sectionCls}>
        <label className={labelCls}>Allowed Submission Types</label>
        <div className="grid grid-cols-2 gap-2">
          {SUBMISSION_TYPES.map(({ key, label, desc }) => {
            const checked = (data.allowedSubmissionTypes || []).includes(key);
            const Icon = key === "file" ? FileUp : key === "image" ? ImageIcon : key === "url" ? Link2 : null;
            return (
              <label
                key={key}
                className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                  checked
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-default bg-surface hover:border-primary/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSubmissionType(key)}
                  className="mt-0.5 size-3.5 accent-primary shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-[10px] text-muted">{desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Requires Approval Toggle */}
      <div>
        <label className={labelCls}>Progression Gate</label>
        <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
          data.requiresApproval
            ? "border-amber-400 bg-amber-50 shadow-sm"
            : "border-default bg-surface hover:border-default"
        }`}>
          <input
            type="checkbox"
            checked={data.requiresApproval}
            onChange={(e) => patch({ requiresApproval: e.target.checked })}
            className="mt-0.5 size-4 accent-amber-500 shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-amber-600" />
              <p className="text-xs font-bold text-foreground">Requires Admin Approval to Unlock Next Day</p>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              Next day stays locked until an admin approves this submission.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
