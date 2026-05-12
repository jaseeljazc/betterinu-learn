"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, ChevronDown, ChevronRight, Plus, Trash2,
  FileText, Image as ImageIcon, Video, FileIcon, Link2, Layers,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FileUploader } from "@/components/ui/FileUploader";
import type { LessonSection, LessonSectionType } from "@/types";

// ── helpers ─────────────────────────────────────────────────────
function uid() {
  return `s_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultSection(type: LessonSectionType): LessonSection {
  switch (type) {
    case "rich_text": return { id: uid(), type, content: "" };
    case "image":     return { id: uid(), type, url: "", caption: "", size: "full" };
    case "video":     return { id: uid(), type, url: "", title: "" };
    case "pdf":       return { id: uid(), type, url: "", filename: "" };
    case "link":      return { id: uid(), type, title: "", url: "", description: "" };
  }
}

const SECTION_TYPES: { type: LessonSectionType; label: string; Icon: any; color: string }[] = [
  { type: "rich_text", label: "Rich Text",      Icon: FileText,   color: "bg-purple-100 text-purple-700" },
  { type: "image",     label: "Image",           Icon: ImageIcon,  color: "bg-blue-100   text-blue-700"   },
  { type: "video",     label: "Video Link",      Icon: Video,      color: "bg-red-100    text-red-700"    },
  { type: "pdf",       label: "PDF",             Icon: FileIcon,   color: "bg-orange-100 text-orange-700" },
  { type: "link",      label: "External Link",   Icon: Link2,      color: "bg-teal-100   text-teal-700"   },
];

// ── Section content editors ──────────────────────────────────────
function SectionEditor({
  section, moduleId, onChange,
}: {
  section: LessonSection;
  moduleId: string;
  onChange: (updated: LessonSection) => void;
}) {
  function patch(fields: Partial<any>) {
    onChange({ ...section, ...fields } as LessonSection);
  }

  const inputCls = "w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted mb-1";

  switch (section.type) {
    case "rich_text":
      return (
        <div className="w-full">
          <RichTextEditor
            value={section.content}
            onChange={(val) => patch({ content: val })}
            placeholder="Type rich content here…"
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          {section.url && (
            <div className="rounded-lg border border-default bg-surface p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.url} crossOrigin="anonymous" alt="Preview" className="max-h-48 object-contain rounded" />
            </div>
          )}
          <div>
            <label className={labelCls}>Image URL or Upload</label>
            <div className="space-y-2">
              <input
                value={section.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="https://… or upload below"
                className={inputCls}
              />
              <FileUploader
                folder={`lessons/${moduleId}/images`}
                files={section.url ? [{ url: section.url, name: "image", type: "image/*" }] : []}
                onChange={(files) => {
                  if (files.length) patch({ url: files[0].url });
                }}
                role="admin"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Caption (optional)</label>
              <input
                value={section.caption ?? ""}
                onChange={(e) => patch({ caption: e.target.value })}
                placeholder="Image caption…"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Display Size</label>
              <select
                value={section.size || "full"}
                onChange={(e) => patch({ size: e.target.value })}
                className={inputCls}
              >
                <option value="sm">Small (25%)</option>
                <option value="md">Medium (50%)</option>
                <option value="lg">Large (75%)</option>
                <option value="full">Full Width (100%)</option>
              </select>
            </div>
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Video URL</label>
            <input
              value={section.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="YouTube, Vimeo, or direct .mp4 URL…"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-muted">
              YouTube: https://youtube.com/watch?v=ID &nbsp;|&nbsp; Vimeo: https://vimeo.com/ID
            </p>
          </div>
          <div>
            <label className={labelCls}>Title (optional)</label>
            <input
              value={section.title ?? ""}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Video title…"
              className={inputCls}
            />
          </div>
        </div>
      );

    case "pdf":
      return (
        <div className="space-y-3">

          <div>
            <label className={labelCls}>PDF URL or Upload</label>
            <div className="space-y-2">
              <input
                value={section.url}
                onChange={(e) => patch({ url: e.target.value })}
                placeholder="https://… or upload below"
                className={inputCls}
              />
              <FileUploader
                folder={`lessons/${moduleId}/pdfs`}
                files={section.url ? [{ url: section.url, name: section.filename ?? "document.pdf", type: "application/pdf" }] : []}
                onChange={(files) => {
                  if (files.length) patch({ url: files[0].url, filename: files[0].name });
                }}
                role="admin"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Filename / Label</label>
            <input
              value={section.filename ?? ""}
              onChange={(e) => patch({ filename: e.target.value })}
              placeholder="document.pdf"
              className={inputCls}
            />
          </div>
        </div>
      );

    case "link":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Title</label>
            <input
              value={section.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Link title…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>URL</label>
            <input
              value={section.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea
              value={section.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Short description…"
              rows={2}
              className={inputCls + " resize-none"}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          <strong>Unsupported Section Type:</strong> This section uses a legacy type ("{(section as any).type}") that has been deprecated. Please delete this section and recreate it.
        </div>
      );
  }
}

// ── Section Preview ────────────────────────────────────────────────
function SectionPreview({ section }: { section: LessonSection }) {
  switch (section.type) {
    case "rich_text":
      return (
        <div 
          className="prose prose-sm max-w-none max-h-32 overflow-hidden relative"
          dangerouslySetInnerHTML={{ __html: section.content || "<p className='text-muted italic'>Empty rich text</p>" }}
        />
      );
    case "image":
      return (
        <div className="flex flex-col items-center gap-2">
          {section.url ? (
            <img src={section.url} alt={section.caption || "Preview"} className="max-h-32 object-contain rounded-md border border-default" />
          ) : (
            <div className="h-24 w-40 bg-subtle border border-dashed rounded flex items-center justify-center text-muted text-xs">No image URL</div>
          )}
          {section.caption && <span className="text-[10px] text-muted italic">{section.caption}</span>}
        </div>
      );
    case "video":
      return (
        <div className="flex flex-col gap-1 items-start bg-subtle p-3 rounded-lg border border-default">
          <span className="font-semibold text-sm">{section.title || "Untitled Video"}</span>
          <a href={section.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Video className="size-3" /> {section.url || "No URL provided"}
          </a>
        </div>
      );
    case "pdf":
      return (
        <div className="flex items-center gap-3 bg-red-50 text-red-900 p-3 rounded-lg border border-red-100">
          <FileIcon className="size-5" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{section.filename || "document.pdf"}</span>
            {section.url && (
              <a href={section.url} target="_blank" rel="noreferrer" className="text-[10px] underline">Open PDF</a>
            )}
          </div>
        </div>
      );
    case "link":
      return (
        <div className="flex flex-col gap-1 bg-teal-50 p-3 rounded-lg border border-teal-100">
          <span className="font-semibold text-sm text-teal-900">{section.title || "Untitled Link"}</span>
          {section.description && <p className="text-xs text-teal-800">{section.description}</p>}
          <a href={section.url} target="_blank" rel="noreferrer" className="text-[10px] text-teal-600 hover:underline break-all">{section.url || "No URL"}</a>
        </div>
      );
    default:
      return <div className="text-xs text-muted">Unknown section type</div>;
  }
}

// ── Sortable item ─────────────────────────────────────────────────
function SortableSection({
  section, moduleId, index, total, onChange, onDelete, defaultCollapsed,
}: {
  section: LessonSection;
  moduleId: string;
  index: number;
  total: number;
  onChange: (s: LessonSection) => void;
  onDelete: () => void;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : (total - index),
  };

  const meta = SECTION_TYPES.find((t) => t.type === section.type) || {
    type: section.type as LessonSectionType,
    label: "Legacy Section",
    Icon: Layers,
    color: "bg-gray-100 text-gray-700",
  };
  const { Icon } = meta;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-default bg-white shadow-sm overflow-visible"
    >
      {/* Header */}
      <div className="flex items-center gap-2 bg-surface px-3 py-2 border-b border-default rounded-t-xl">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted hover:text-primary touch-none p-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>

        {/* Type badge */}
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
          <Icon className="size-3" />
          {meta.label}
        </span>

        <span className="text-[10px] text-muted ml-1">#{index + 1}</span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Edit Section" : "Finish Editing"}
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 rounded transition-colors"
          >
            {collapsed ? "Edit" : "Done"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-muted hover:text-red-600 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {collapsed ? (
        <div className="p-4 relative">
          <SectionPreview section={section} />
          {/* Fading overlay for rich text to indicate it's a preview */}
          {section.type === "rich_text" && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-50/50 rounded-b-xl">
          <SectionEditor section={section} moduleId={moduleId} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────
interface LessonSectionEditorProps {
  sections: LessonSection[];
  moduleId: string;
  onChange: (sections: LessonSection[]) => void;
}

export function LessonSectionEditor({ sections, moduleId, onChange }: LessonSectionEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const from = sections.findIndex((s) => s.id === active.id);
        const to = sections.findIndex((s) => s.id === over.id);
        onChange(arrayMove(sections, from, to));
      }
    },
    [sections, onChange]
  );

  function addSection(type: LessonSectionType) {
    onChange([...sections, defaultSection(type)]);
  }

  function updateSection(index: number, updated: LessonSection) {
    const next = [...sections];
    next[index] = updated;
    onChange(next);
  }

  function deleteSection(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, i) => (
            <SortableSection
              key={section.id}
              section={section}
              moduleId={moduleId}
              index={i}
              total={sections.length}
              onChange={(updated) => updateSection(i, updated)}
              onDelete={() => deleteSection(i)}
              defaultCollapsed={true}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-default py-8 text-center text-muted">
          <Layers className="size-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No sections yet.</p>
          <p className="text-xs mt-1">Add a section below to build your lesson.</p>
        </div>
      )}

      {/* Add Section buttons */}
      <div className="rounded-xl border border-dashed border-default bg-surface/50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
          <Plus className="size-3 inline mr-1" />
          Add Section
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPES.map(({ type, label, Icon, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => addSection(type)}
              className={`flex items-center gap-1.5 rounded-full border border-default px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm hover:scale-105 active:scale-95 ${color}`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
