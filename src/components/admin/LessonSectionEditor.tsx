"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
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
  GripVertical, Plus, Trash2,
  FileText, Image as ImageIcon, Video, FileIcon, Link2, Layers, Columns2,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { FileUploader } from "@/components/ui/FileUploader";
import type { LessonSection, LessonSectionType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── helpers ─────────────────────────────────────────────────────
function uid() {
  return `s_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultColCell(type: string): any {
  switch (type) {
    case "rich_text": return { id: uid(), type, content: "" };
    case "image":     return { id: uid(), type, url: "", caption: "", size: "full" };
    case "video":     return { id: uid(), type, url: "", title: "" };
    case "pdf":       return { id: uid(), type, url: "", filename: "" };
    case "link":      return { id: uid(), type, title: "", url: "", description: "" };
    default:          return { id: uid(), type: "rich_text", content: "" };
  }
}

function defaultSection(type: LessonSectionType): LessonSection {
  switch (type) {
    case "rich_text": return { id: uid(), type, content: "" };
    case "image":     return { id: uid(), type, url: "", caption: "", size: "full" };
    case "video":     return { id: uid(), type, url: "", title: "" };
    case "pdf":       return { id: uid(), type, url: "", filename: "" };
    case "link":      return { id: uid(), type, title: "", url: "", description: "" };
    case "task":      return { id: uid(), type, title: "", description: "", submissionType: "url", deadline: "" };
    case "columns":   return {
      id: uid(), type,
      columnCount: 2,
      cols: [defaultColCell("rich_text"), defaultColCell("rich_text")],
    } as any;
  }
}

const SECTION_TYPES: { type: LessonSectionType; label: string; Icon: any; color: string }[] = [
  { type: "rich_text", label: "Rich Text",    Icon: FileText,   color: "bg-purple-100 text-purple-700" },
  { type: "image",     label: "Image",         Icon: ImageIcon,  color: "bg-blue-100 text-blue-700"   },
  { type: "video",     label: "Video Link",    Icon: Video,      color: "bg-red-100 text-red-700"    },
  { type: "pdf",       label: "PDF",           Icon: FileIcon,   color: "bg-orange-100 text-orange-700" },
  { type: "link",      label: "External Link", Icon: Link2,      color: "bg-teal-100 text-teal-700"   },
  { type: "columns",   label: "Columns",       Icon: Columns2,   color: "bg-pink-100 text-pink-700"   },
];

const COL_TYPES = [
  { type: "rich_text", label: "Rich Text", Icon: FileText },
  { type: "image",     label: "Image",     Icon: ImageIcon },
  { type: "video",     label: "Video",     Icon: Video },
  { type: "pdf",       label: "PDF",       Icon: FileIcon },
  { type: "link",      label: "Link",      Icon: Link2 },
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
              <Image src={section.url} alt="Preview" width={400} height={192} unoptimized className="max-h-48 object-contain rounded" />
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
              <Select value={section.size || "full"} onValueChange={(v) => patch({ size: v })}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (25%)</SelectItem>
                  <SelectItem value="md">Medium (50%)</SelectItem>
                  <SelectItem value="lg">Large (75%)</SelectItem>
                  <SelectItem value="full">Full Width (100%)</SelectItem>
                </SelectContent>
              </Select>
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
          <div>
            <label className={labelCls}>Icon / Preview Image</label>
            <FileUploader
              folder={`lessons/${moduleId}/links`}
              files={section.thumbnailUrl ? [{ url: section.thumbnailUrl, name: "icon", type: "image/*" }] : []}
              onChange={(files) => {
                if (files.length) patch({ thumbnailUrl: files[0].url });
              }}
              role="admin"
            />
          </div>
        </div>
      );

    case "columns": {
      const s = section as any;
      return <ColumnsEditor section={s} moduleId={moduleId} onChange={patch} />;
    }

    default:
      return (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          <strong>Unsupported Section Type:</strong> "{(section as any).type}" — delete and recreate.
        </div>
      );
  }
}

// ── Columns Editor ─────────────────────────────────────────────────
function ColumnsEditor({
  section, moduleId, onChange,
}: {
  section: any;
  moduleId: string;
  onChange: (fields: Partial<any>) => void;
}) {
  const inputCls = "w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted mb-1";

  const count: 2 | 3 = section.columnCount || 2;
  const cols: any[] = section.cols || [];

  function setCount(n: 2 | 3) {
    let next = [...cols];
    if (n > next.length) {
      while (next.length < n) next.push(defaultColCell("rich_text"));
    } else {
      next = next.slice(0, n);
    }
    onChange({ columnCount: n, cols: next });
  }

  function updateCol(i: number, fields: Partial<any>) {
    const next = cols.map((c, idx) => idx === i ? { ...c, ...fields } : c);
    onChange({ cols: next });
  }

  function changeColType(i: number, type: string) {
    const next = cols.map((c, idx) => idx === i ? { ...defaultColCell(type), id: c.id } : c);
    onChange({ cols: next });
  }

  return (
    <div className="space-y-4">
      {/* Column count toggle */}
      <div>
        <label className={labelCls}>Layout</label>
        <div className="flex gap-2">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
                count === n ? "bg-primary text-white border-primary" : "border-default bg-surface text-muted hover:text-primary"
              }`}
            >
              <Columns2 className="size-4" />
              {n} Columns
            </button>
          ))}
        </div>
      </div>

      {/* Column editors */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const col = cols[i] || defaultColCell("rich_text");
          const meta = COL_TYPES.find((t) => t.type === col.type) || COL_TYPES[0];
          return (
            <div key={col.id || i} className="rounded-xl border border-default bg-white overflow-hidden">
              {/* Col header */}
              <div className="flex items-center gap-2 bg-surface px-3 py-2 border-b border-default">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Column {i + 1}</span>
                <Select value={col.type} onValueChange={(v) => changeColType(i, v)}>
                  <SelectTrigger className="ml-auto h-6 w-32 text-[10px] font-semibold border border-default rounded-md bg-white text-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COL_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Col content editor */}
              <div className="p-3">
                {col.type === "rich_text" && (
                  <RichTextEditor
                    value={col.content || ""}
                    onChange={(v) => updateCol(i, { content: v })}
                    placeholder="Type column content…"
                  />
                )}
                {col.type === "image" && (
                  <div className="space-y-2">
                    {col.url && (
                      <Image src={col.url} alt="preview" width={400} height={144} unoptimized className="max-h-36 w-full object-contain rounded border border-default" />
                    )}
                    <input value={col.url || ""} onChange={(e) => updateCol(i, { url: e.target.value })} placeholder="Image URL…" className={inputCls} />
                    <input value={col.caption || ""} onChange={(e) => updateCol(i, { caption: e.target.value })} placeholder="Caption (optional)" className={inputCls} />
                    <Select value={col.size || "full"} onValueChange={(v) => updateCol(i, { size: v })}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {col.type === "video" && (
                  <div className="space-y-2">
                    <input value={col.url || ""} onChange={(e) => updateCol(i, { url: e.target.value })} placeholder="YouTube / Vimeo / mp4 URL…" className={inputCls} />
                    <input value={col.title || ""} onChange={(e) => updateCol(i, { title: e.target.value })} placeholder="Title (optional)" className={inputCls} />
                  </div>
                )}
                {col.type === "pdf" && (
                  <div className="space-y-2">
                    <input value={col.url || ""} onChange={(e) => updateCol(i, { url: e.target.value })} placeholder="PDF URL…" className={inputCls} />
                    <input value={col.filename || ""} onChange={(e) => updateCol(i, { filename: e.target.value })} placeholder="Filename" className={inputCls} />
                  </div>
                )}
                {col.type === "link" && (
                  <div className="space-y-2">
                    <input value={col.title || ""} onChange={(e) => updateCol(i, { title: e.target.value })} placeholder="Link title…" className={inputCls} />
                    <input value={col.url || ""} onChange={(e) => updateCol(i, { url: e.target.value })} placeholder="https://…" className={inputCls} />
                    <input value={col.description || ""} onChange={(e) => updateCol(i, { description: e.target.value })} placeholder="Description (optional)" className={inputCls} />
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-muted">Icon / Thumbnail</label>
                      <FileUploader
                        folder={`lessons/${moduleId}/links`}
                        files={col.thumbnailUrl ? [{ url: col.thumbnailUrl, name: "icon", type: "image/*" }] : []}
                        onChange={(files) => {
                          if (files.length) updateCol(i, { thumbnailUrl: files[0].url });
                        }}
                        role="admin"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
            <Image src={section.url} alt={section.caption || "Preview"} width={400} height={128} unoptimized className="max-h-32 object-contain rounded-md border border-default" />
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
    case "columns": {
      const s = section as any;
      const cols = s.cols || [];
      return (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${s.columnCount || 2}, 1fr)` }}
        >
          {cols.map((col: any, i: number) => (
            <div key={col.id || i} className="rounded-lg border border-dashed border-default bg-subtle p-2 text-[10px] text-muted text-center">
              <span className="font-semibold uppercase tracking-wider block mb-0.5">{col.type?.replace("_", " ")}</span>
              {col.content ? (
                <div className="text-left text-xs line-clamp-2 text-foreground" dangerouslySetInnerHTML={{ __html: col.content }} />
              ) : col.url ? (
                <span className="truncate block">{col.url}</span>
              ) : (
                <span className="italic">Empty</span>
              )}
            </div>
          ))}
        </div>
      );
    }
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
