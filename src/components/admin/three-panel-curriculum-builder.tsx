"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  FileIcon,
  Link2,
  CheckSquare,
  Save,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  ClipboardList,
  ExternalLink,
  Lock,
  Columns2,
} from "lucide-react";
import type { LessonSection, LessonSectionType } from "@/types";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { FileUploader } from "@/components/ui/FileUploader";
import { SectionBlock } from "@/components/learn/lesson-section-viewer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuizModuleEditor } from "@/components/admin/quiz-module-editor";
import { AssignmentModuleEditor } from "@/components/admin/assignment-module-editor";
import { TruncatedText } from "@/components/truncated-text";

// --- HELPERS ---
function uid() {
  return `s_${Math.random().toString(36).slice(2, 9)}`;
}

const SECTION_TYPES: {
  type: LessonSectionType;
  label: string;
  Icon: any;
  color: string;
}[] = [
  {
    type: "rich_text",
    label: "Rich Text",
    Icon: FileText,
    color: "bg-purple-100 text-purple-700",
  },
  {
    type: "image",
    label: "Image",
    Icon: ImageIcon,
    color: "bg-blue-100 text-blue-700",
  },
  {
    type: "video",
    label: "Video Link",
    Icon: Video,
    color: "bg-red-100 text-red-700",
  },
  {
    type: "pdf",
    label: "PDF",
    Icon: FileIcon,
    color: "bg-orange-100 text-orange-700",
  },
  {
    type: "link",
    label: "External Link",
    Icon: Link2,
    color: "bg-teal-100 text-teal-700",
  },
  {
    type: "task",
    label: "Task",
    Icon: CheckSquare,
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    type: "columns",
    label: "Columns",
    Icon: Columns2,
    color: "bg-pink-100 text-pink-700",
  },
];

function defaultSection(type: LessonSectionType): LessonSection {
  switch (type) {
    case "rich_text":
      return { id: uid(), type, content: "" };
    case "image":
      return { id: uid(), type, url: "", caption: "", size: "full" };
    case "video":
      return { id: uid(), type, url: "", title: "" };
    case "pdf":
      return { id: uid(), type, url: "", filename: "" };
    case "link":
      return {
        id: uid(),
        type,
        title: "",
        url: "",
        description: "",
        thumbnailUrl: "",
      };
    case "task":
      return {
        id: uid(),
        type,
        title: "",
        description: "",
        submissionType: "url",
        deadline: "",
      };
    case "columns":
      return {
        id: uid(),
        type,
        columnCount: 2,
        cols: [
          { id: uid(), type: "rich_text", content: "" },
          { id: uid(), type: "rich_text", content: "" },
        ],
      };
  }
}

// Default content for a single column cell
function defaultColContent(type: string) {
  switch (type) {
    case "rich_text":
      return { content: "" };
    case "image":
      return { url: "", caption: "", size: "full" };
    case "video":
      return { url: "", title: "" };
    case "pdf":
      return { url: "", filename: "" };
    case "link":
      return { title: "", url: "", description: "", thumbnailUrl: "" };
    default:
      return {};
  }
}

const COL_TYPES = [
  { type: "rich_text", label: "Rich Text", Icon: FileText },
  { type: "image", label: "Image", Icon: ImageIcon },
  { type: "video", label: "Video", Icon: Video },
  { type: "pdf", label: "PDF", Icon: FileIcon },
  { type: "link", label: "Link", Icon: Link2 },
];

// Helper to get module type metadata
function getModuleTypeMeta(type: string) {
  if (type === "quiz")
    return {
      Icon: HelpCircle,
      color: "text-purple-500",
      bg: "bg-purple-100",
      label: "Quiz",
    };
  if (type === "assignment")
    return {
      Icon: ClipboardList,
      color: "text-orange-500",
      bg: "bg-orange-100",
      label: "Assignment",
    };
  return {
    Icon: FileText,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Lesson",
  };
}

// Dropdown to add Lesson / Quiz / Assignment to a Day
function AddModuleDropdown({
  onAddLesson,
  onAddQuiz,
  onAddAssignment,
}: {
  onAddLesson: () => void;
  onAddQuiz: () => void;
  onAddAssignment: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-0.5 text-muted hover:text-primary"
        title="Add content"
      >
        <Plus className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-default rounded-lg shadow-lg min-w-[140px]">
          <button
            type="button"
            onClick={() => {
              onAddLesson();
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-subtle transition-colors text-left"
          >
            <FileText className="size-3.5 text-green-600" /> Lesson
          </button>
          {/* <button
            type="button"
            onClick={() => {
              onAddQuiz();
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-subtle transition-colors text-left"
          >
            <HelpCircle className="size-3.5 text-purple-500" /> Quiz
          </button> */}
          <button
            type="button"
            onClick={() => {
              onAddAssignment();
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-subtle transition-colors text-left"
          >
            <ClipboardList className="size-3.5 text-orange-500" /> Assignment
          </button>
        </div>
      )}
    </div>
  );
}

// --- DND SORTABLE ITEMS ---
function SortableLessonItem({
  mod,
  isActive,
  onClick,
  onRename,
  onRemove,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(mod.title || "");
  const meta = getModuleTypeMeta(mod.type);

  function commitRename() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!editing) onClick();
      }}
      className={`group/lesson flex items-center gap-1.5 px-1 py-1 rounded-md cursor-pointer transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-subtle text-muted-foreground hover:text-foreground"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 text-muted hover:text-primary cursor-grab active:cursor-grabbing p-0.5 opacity-0 group-hover/lesson:opacity-100 transition-all max-w-0 group-hover/lesson:max-w-[20px] overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-3 shrink-0" />
      </button>
      <meta.Icon className={`size-3 shrink-0 ${meta.color}`} />
      {editing ? (
        <input
          autoFocus
          className="flex-1 text-xs border border-primary rounded px-1 py-0.5 outline-none bg-background"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setDraft(mod.title || "");
              setEditing(false);
            }
          }}
          onBlur={(e) => {
            if (
              !e.relatedTarget ||
              !e.currentTarget.parentElement?.contains(e.relatedTarget as Node)
            ) {
              commitRename();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <TruncatedText
          text={mod.title || "Untitled Lesson"}
          className="flex-1 text-xs"
        />
      )}

      <div
        className={`flex items-center gap-0.5 justify-end ${editing ? "flex" : "opacity-0 group-hover/lesson:opacity-100 max-w-0 group-hover/lesson:max-w-[50px] overflow-hidden"} transition-all`}
      >
        {editing ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                commitRename();
              }}
              className="p-0.5 text-primary hover:text-primary"
            >
              <Check className="size-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(mod.title || "");
                setEditing(false);
              }}
              className="p-0.5 text-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(mod.title || "");
                setEditing(true);
              }}
              className="p-0.5 text-muted hover:text-primary"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-0.5 text-muted hover:text-red-500"
            >
              <Trash2 className="size-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SortableDayItem({
  day,
  wIdx,
  dIdx,
  activeNode,
  onRenameDay,
  onRemoveDay,
  onAddLesson,
  onAddQuiz,
  onAddAssignment,
  onSelectLesson,
  onRenameLesson,
  onRemoveLesson,
  onDragEndLessons,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(day.title || day.label || "");
  const [expanded, setExpanded] = React.useState(true);

  function commitRename() {
    if (draft.trim()) onRenameDay(draft.trim());
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface rounded-md border border-transparent hover:border-default transition-colors pb-1"
    >
      <div
        className={`group/day flex items-center gap-1.5 px-1 py-1 rounded-md transition-colors ${
          activeNode?.wIdx === wIdx &&
          activeNode?.dIdx === dIdx &&
          activeNode?.mIdx === undefined
            ? "bg-primary/5 text-primary font-medium"
            : "hover:bg-subtle text-foreground"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 text-muted hover:text-primary cursor-grab active:cursor-grabbing p-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          type="button"
          className="text-muted hover:text-foreground shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </button>

        {editing ? (
          <input
            autoFocus
            className="flex-1 text-sm border border-primary rounded px-1.5 py-0.5 outline-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(day.title || day.label || "");
                setEditing(false);
              }
            }}
            onBlur={(e) => {
              if (
                !e.relatedTarget ||
                !e.currentTarget.parentElement?.contains(
                  e.relatedTarget as Node,
                )
              ) {
                commitRename();
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <TruncatedText
            text={day.title || day.label || "Untitled Day"}
            className="flex-1 text-sm font-semibold"
          />
        )}

        <div
          className={`flex items-center gap-0.5 ${editing ? "flex" : "opacity-0 group-hover/day:opacity-100"} transition-opacity`}
        >
          {editing ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  commitRename();
                }}
                className="p-0.5 text-primary hover:text-primary"
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft(day.title || day.label || "");
                  setEditing(false);
                }}
                className="p-0.5 text-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <AddModuleDropdown
                onAddLesson={() => {
                  onAddLesson();
                  setExpanded(true);
                }}
                onAddQuiz={() => {
                  onAddQuiz();
                  setExpanded(true);
                }}
                onAddAssignment={() => {
                  onAddAssignment();
                  setExpanded(true);
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft(day.title || day.label || "");
                  setEditing(true);
                }}
                className="p-0.5 text-muted hover:text-primary"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDay();
                }}
                className="p-0.5 text-muted hover:text-red-500"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pl-2 pr-1 py-1 space-y-0.5 border-l border-default ml-2.5">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(e) => onDragEndLessons(e, dIdx)}
          >
            <SortableContext
              items={(day.subModules || []).map((m: any) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {day.subModules?.map((mod: any, mIdx: number) => (
                <SortableLessonItem
                  key={mod.id}
                  mod={mod}
                  isActive={
                    activeNode?.wIdx === wIdx &&
                    activeNode?.dIdx === dIdx &&
                    activeNode?.mIdx === mIdx
                  }
                  onClick={() => onSelectLesson(mIdx)}
                  onRename={(title: string) => onRenameLesson(mIdx, title)}
                  onRemove={() => onRemoveLesson(mIdx)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {(!day.subModules || day.subModules.length === 0) && (
            <p className="text-[10px] text-muted italic ml-1.5 mt-1">
              No lessons
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WeekSection({
  week,
  wIdx,
  activeNode,
  onAddDay,
  onRenameWeek,
  onRemoveWeek,
  onSelectDay,
  onRenameDay,
  onRemoveDay,
  onDragEndDays,
  onAddLesson,
  onAddQuiz,
  onAddAssignment,
  onSelectLesson,
  onRenameLesson,
  onRemoveLesson,
  onDragEndLessons,
}: any) {
  const [editingWeek, setEditingWeek] = React.useState(false);
  const [weekDraft, setWeekDraft] = React.useState(
    week.title || `Week ${wIdx + 1}`,
  );
  const [expanded, setExpanded] = React.useState(true);

  function commitWeekRename() {
    if (weekDraft.trim()) onRenameWeek(weekDraft.trim());
    setEditingWeek(false);
  }

  return (
    <div className="space-y-0.5">
      {/* Week header */}
      <div className="group/week flex items-center gap-1 px-1 py-1 rounded transition-colors hover:bg-subtle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-muted hover:text-foreground shrink-0 p-0.5"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        {editingWeek ? (
          <>
            <input
              autoFocus
              className="flex-1 text-xs font-bold uppercase border border-primary rounded px-1.5 py-0.5 outline-none tracking-widest"
              value={weekDraft}
              onChange={(e) => setWeekDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitWeekRename();
                if (e.key === "Escape") {
                  setWeekDraft(week.title || `Week ${wIdx + 1}`);
                  setEditingWeek(false);
                }
              }}
              onBlur={(e) => {
                if (
                  !e.relatedTarget ||
                  !e.currentTarget.parentElement?.contains(
                    e.relatedTarget as Node,
                  )
                ) {
                  commitWeekRename();
                }
              }}
            />
            <button
              type="button"
              onClick={commitWeekRename}
              className="p-0.5 text-primary hover:text-primary shrink-0"
            >
              <Check className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setWeekDraft(week.title || `Week ${wIdx + 1}`);
                setEditingWeek(false);
              }}
              className="p-0.5 text-muted shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <TruncatedText
              text={week.title || `Week ${wIdx + 1}`}
              className="flex-1 text-xs font-bold uppercase text-muted tracking-widest"
            />
            <div className="flex items-center gap-0.5 opacity-0 group-hover/week:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => {
                  setWeekDraft(week.title || `Week ${wIdx + 1}`);
                  setEditingWeek(true);
                }}
                className="p-0.5 text-muted hover:text-primary"
                title="Rename week"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onAddDay}
                className="p-0.5 text-muted hover:text-primary"
                title="Add day"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemoveWeek}
                className="p-0.5 text-muted hover:text-red-500"
                title="Delete week"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Days */}
      {expanded && (
        <div className="pl-4 ml-1.5 border-l border-default space-y-2 py-1">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={onDragEndDays}
          >
            <SortableContext
              items={week.days.map((d: any) => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {week.days.map((day: any, dIdx: number) => (
                <SortableDayItem
                  key={day.id}
                  day={day}
                  wIdx={wIdx}
                  dIdx={dIdx}
                  activeNode={activeNode}
                  onRenameDay={(title: string) => onRenameDay(dIdx, title)}
                  onRemoveDay={() => onRemoveDay(dIdx)}
                  onAddLesson={() => onAddLesson(dIdx)}
                  onAddQuiz={() => onAddQuiz(dIdx)}
                  onAddAssignment={() => onAddAssignment(dIdx)}
                  onSelectLesson={(mIdx: number) => onSelectLesson(dIdx, mIdx)}
                  onRenameLesson={(mIdx: number, title: string) =>
                    onRenameLesson(dIdx, mIdx, title)
                  }
                  onRemoveLesson={(mIdx: number) => onRemoveLesson(dIdx, mIdx)}
                  onDragEndLessons={onDragEndLessons}
                />
              ))}
            </SortableContext>
          </DndContext>

          {week.days.length === 0 && (
            <p className="text-[10px] text-muted italic ml-1.5 mt-1">
              No days yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SortableSectionItem({
  section,
  onClick,
  isActive,
  onRemove,
  pageBgColor,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // Prioritize section bg color, then page bg color, fallback to white
    backgroundColor: section.bgColor || pageBgColor || "#ffffff",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group relative rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
          : "border-transparent hover:border-default hover:shadow-sm"
      }`}
    >
      {/* Drag Handle (Shows on hover) */}
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-muted hover:text-foreground">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 bg-surface border border-default rounded-md shadow-sm"
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      {/* Delete Button (Shows on hover) */}
      <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted hover:text-red-500 p-1 bg-surface border border-default rounded-md shadow-sm"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="pointer-events-none" style={{ zoom: 0.85 } as any}>
        <SectionBlock section={section} />
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export function ThreePanelCurriculumBuilder({
  form,
  update,
  onSave,
  onCancel,
  saving,
}: any) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNode, setActiveNode] = useState<{
    wIdx: number;
    dIdx: number;
    mIdx?: number;
  } | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeColTab, setActiveColTab] = useState(0);

  // Safely get current active day
  const activeDay = activeNode
    ? form.curriculum?.[activeNode.wIdx]?.days?.[activeNode.dIdx]
    : null;
  // Safely get active module (lesson)
  const activeModule =
    activeNode && activeNode.mIdx !== undefined
      ? activeDay?.subModules?.[activeNode.mIdx]
      : activeDay?.subModules?.[0];
  const activeSections = activeModule?.sections || [];

  // Safely get active section
  const activeSection = activeSections.find(
    (s: any) => s.id === activeSectionId,
  );
  const activeSectionIndex = activeSections.findIndex(
    (s: any) => s.id === activeSectionId,
  );

  // --- ACTIONS ---
  const addDay = (wIdx: number) => {
    const next = [...(form.curriculum || [])];
    const newDayId = `d-${Date.now().toString(36)}`;
    next[wIdx].days.push({
      id: newDayId,
      label: `Day ${next[wIdx].days.length + 1}`,
      title: `Day ${next[wIdx].days.length + 1}`,
      isCompleted: false,
      subModules: [
        {
          id: `m-${Date.now().toString(36)}`,
          title: "Content",
          type: "doc",
          duration: "0",
          isCompleted: false,
          sections: [],
        },
      ],
    });
    update("curriculum", next);
    setActiveNode({ wIdx, dIdx: next[wIdx].days.length - 1, mIdx: 0 });
  };

  const addWeek = () => {
    const next = [...(form.curriculum || [])];
    next.push({
      id: `w-${Date.now().toString(36)}`,
      title: `Week ${next.length + 1}`,
      days: [],
    });
    update("curriculum", next);
  };

  const removeWeek = (wIdx: number) => {
    if (
      !window.confirm(
        `Delete this entire week and all its days? This cannot be undone.`,
      )
    )
      return;
    const next = [...form.curriculum];
    next.splice(wIdx, 1);
    update("curriculum", next);
    if (activeNode?.wIdx === wIdx) {
      setActiveNode(null);
      setActiveSectionId(null);
    } else if (activeNode && activeNode.wIdx > wIdx) {
      setActiveNode({ ...activeNode, wIdx: activeNode.wIdx - 1 });
    }
  };

  const renameWeek = (wIdx: number, title: string) => {
    const next = structuredClone(form.curriculum);
    next[wIdx].title = title;
    update("curriculum", next);
  };

  const renameDay = (wIdx: number, dIdx: number, title: string) => {
    const next = structuredClone(form.curriculum);
    next[wIdx].days[dIdx].title = title;
    next[wIdx].days[dIdx].label = title;
    update("curriculum", next);
  };

  const removeDay = (wIdx: number, dIdx: number) => {
    if (
      !window.confirm(
        `Delete this day and all its content? This cannot be undone.`,
      )
    )
      return;
    const next = [...form.curriculum];
    next[wIdx].days.splice(dIdx, 1);
    update("curriculum", next);
    if (activeNode?.wIdx === wIdx && activeNode?.dIdx === dIdx) {
      setActiveNode(null);
      setActiveSectionId(null);
    } else if (activeNode?.wIdx === wIdx && activeNode.dIdx > dIdx) {
      setActiveNode({ ...activeNode, dIdx: activeNode.dIdx - 1 });
    }
  };

  const addLesson = (wIdx: number, dIdx: number) => {
    const next = [...form.curriculum];
    next[wIdx].days[dIdx].subModules.push({
      id: `m-${Date.now().toString(36)}`,
      title: "New Lesson",
      type: "lesson",
      duration: "0",
      isCompleted: false,
      sections: [],
    });
    update("curriculum", next);
    setActiveNode({
      wIdx,
      dIdx,
      mIdx: next[wIdx].days[dIdx].subModules.length - 1,
    });
  };

  const addQuiz = (wIdx: number, dIdx: number) => {
    const next = [...form.curriculum];
    next[wIdx].days[dIdx].subModules.push({
      id: `m-${Date.now().toString(36)}`,
      title: "Quiz",
      type: "quiz",
      duration: "0",
      isCompleted: false,
      quizData: { questions: [], passingScore: 70, maxAttempts: undefined },
    });
    update("curriculum", next);
    setActiveNode({
      wIdx,
      dIdx,
      mIdx: next[wIdx].days[dIdx].subModules.length - 1,
    });
  };

  const addAssignment = (wIdx: number, dIdx: number) => {
    const next = [...form.curriculum];
    next[wIdx].days[dIdx].subModules.push({
      id: `m-${Date.now().toString(36)}`,
      title: "Assignment",
      type: "assignment",
      duration: "0",
      isCompleted: false,
      assignmentData: {
        title: "",
        instructions: "",
        allowedSubmissionTypes: ["text"],
        requiresApproval: true,
      },
    });
    update("curriculum", next);
    setActiveNode({
      wIdx,
      dIdx,
      mIdx: next[wIdx].days[dIdx].subModules.length - 1,
    });
  };

  const renameLesson = (
    wIdx: number,
    dIdx: number,
    mIdx: number,
    title: string,
  ) => {
    const next = structuredClone(form.curriculum);
    next[wIdx].days[dIdx].subModules[mIdx].title = title;
    update("curriculum", next);
  };

  const removeLesson = (wIdx: number, dIdx: number, mIdx: number) => {
    if (
      !window.confirm(
        `Delete this lesson and all its content? This cannot be undone.`,
      )
    )
      return;
    const next = [...form.curriculum];
    next[wIdx].days[dIdx].subModules.splice(mIdx, 1);
    update("curriculum", next);
    if (
      activeNode?.wIdx === wIdx &&
      activeNode?.dIdx === dIdx &&
      activeNode?.mIdx === mIdx
    ) {
      setActiveNode(null);
      setActiveSectionId(null);
    } else if (
      activeNode?.wIdx === wIdx &&
      activeNode?.dIdx === dIdx &&
      activeNode.mIdx &&
      activeNode.mIdx > mIdx
    ) {
      setActiveNode({ ...activeNode, mIdx: activeNode.mIdx - 1 });
    }
  };

  const addSection = (type: LessonSectionType, insertIndex?: number) => {
    if (!activeNode || !activeDay) return;
    const next = [...form.curriculum];
    let mod =
      next[activeNode.wIdx].days[activeNode.dIdx].subModules[
        activeNode.mIdx ?? 0
      ];
    if (!mod) {
      mod = {
        id: `m-${Date.now().toString(36)}`,
        title: "Content",
        type: "doc",
        duration: "0",
        isCompleted: false,
        sections: [],
      };
      next[activeNode.wIdx].days[activeNode.dIdx].subModules.push(mod);
      setActiveNode({
        ...activeNode,
        mIdx: next[activeNode.wIdx].days[activeNode.dIdx].subModules.length - 1,
      });
    }
    if (!mod.sections) mod.sections = [];

    const newSection = defaultSection(type);
    if (typeof insertIndex === "number") {
      mod.sections.splice(insertIndex + 1, 0, newSection);
    } else {
      mod.sections.push(newSection);
    }
    update("curriculum", next);
    setActiveSectionId(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    if (!activeNode) return;
    const next = [...form.curriculum];
    const mod =
      next[activeNode.wIdx].days[activeNode.dIdx].subModules[
        activeNode.mIdx ?? 0
      ];
    if (mod && mod.sections) {
      mod.sections = mod.sections.filter((s: any) => s.id !== sectionId);
      update("curriculum", next);
      if (activeSectionId === sectionId) setActiveSectionId(null);
    }
  };

  const updateSection = (fields: Partial<LessonSection>) => {
    if (!activeNode || activeSectionIndex === -1) return;
    const next = [...form.curriculum];
    const mod =
      next[activeNode.wIdx].days[activeNode.dIdx].subModules[
        activeNode.mIdx ?? 0
      ];
    mod.sections[activeSectionIndex] = {
      ...mod.sections[activeSectionIndex],
      ...fields,
    };
    update("curriculum", next);
  };

  const updateModule = (fields: Partial<any>) => {
    if (!activeNode) return;
    const next = [...form.curriculum];
    const mod =
      next[activeNode.wIdx].days[activeNode.dIdx].subModules[
        activeNode.mIdx ?? 0
      ];
    if (mod) {
      Object.assign(mod, fields);
      update("curriculum", next);
    }
  };

  const handleDragEndDays = (e: DragEndEvent, wIdx: number) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const next = [...form.curriculum];
      const days = next[wIdx].days;
      const oldIdx = days.findIndex((d: any) => d.id === active.id);
      const newIdx = days.findIndex((d: any) => d.id === over.id);
      next[wIdx].days = arrayMove(days, oldIdx, newIdx);
      update("curriculum", next);

      // Update activeNode to follow the dragged day
      if (
        activeNode &&
        activeNode.wIdx === wIdx &&
        activeNode.dIdx === oldIdx
      ) {
        setActiveNode({ ...activeNode, dIdx: newIdx });
      }
    }
  };

  const handleDragEndLessons = (
    e: DragEndEvent,
    wIdx: number,
    dIdx: number,
  ) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const next = [...form.curriculum];
      const lessons = next[wIdx].days[dIdx].subModules;
      const oldIdx = lessons.findIndex((m: any) => m.id === active.id);
      const newIdx = lessons.findIndex((m: any) => m.id === over.id);
      next[wIdx].days[dIdx].subModules = arrayMove(lessons, oldIdx, newIdx);
      update("curriculum", next);

      // Update activeNode to follow the dragged lesson
      if (
        activeNode &&
        activeNode.wIdx === wIdx &&
        activeNode.dIdx === dIdx &&
        activeNode.mIdx === oldIdx
      ) {
        setActiveNode({ ...activeNode, mIdx: newIdx });
      }
    }
  };

  const handleDragEndSections = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id && activeNode) {
      const next = [...form.curriculum];
      const sections =
        next[activeNode.wIdx].days[activeNode.dIdx].subModules[
          activeNode.mIdx ?? 0
        ].sections;
      const oldIdx = sections.findIndex((s: any) => s.id === active.id);
      const newIdx = sections.findIndex((s: any) => s.id === over.id);
      next[activeNode.wIdx].days[activeNode.dIdx].subModules[
        activeNode.mIdx ?? 0
      ].sections = arrayMove(sections, oldIdx, newIdx);
      update("curriculum", next);
    }
  };

  const helpRef = useRef<HTMLButtonElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = helpRef.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, [sidebarCollapsed]);

  return (
    <TooltipProvider>
      <div className="flex h-[85vh] border border-default rounded-xl overflow-hidden bg-background shadow-sm">
        {/* LEFT PANEL: Curriculum Sidebar */}
        <div
          className={`flex flex-col border-r border-default transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-72"} bg-surface shrink-0 relative z-20`}
        >
          <div className="p-3 border-b border-default flex items-center justify-between gap-2">
            {!sidebarCollapsed && (
              <>
                <h3 className="font-bold text-sm">Curriculum</h3>
                <button
                  type="button"
                  onClick={addWeek}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded px-2 py-1 ml-auto transition-colors"
                  title="Add Week"
                >
                  <Plus className="size-3.5" /> Week
                </button>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-muted hover:text-foreground shrink-0"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="size-5" />
                  ) : (
                    <PanelLeftClose className="size-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
            {!sidebarCollapsed &&
              form.curriculum?.map((week: any, wIdx: number) => {
                return (
                  <WeekSection
                    key={week.id}
                    week={week}
                    wIdx={wIdx}
                    activeNode={activeNode}
                    onAddDay={() => addDay(wIdx)}
                    onRenameWeek={(title: string) => renameWeek(wIdx, title)}
                    onRemoveWeek={() => removeWeek(wIdx)}
                    onRenameDay={(dIdx: number, title: string) =>
                      renameDay(wIdx, dIdx, title)
                    }
                    onRemoveDay={(dIdx: number) => removeDay(wIdx, dIdx)}
                    onAddLesson={(dIdx: number) => addLesson(wIdx, dIdx)}
                    onAddQuiz={(dIdx: number) => addQuiz(wIdx, dIdx)}
                    onAddAssignment={(dIdx: number) =>
                      addAssignment(wIdx, dIdx)
                    }
                    onSelectLesson={(dIdx: number, mIdx: number) =>
                      setActiveNode({ wIdx, dIdx, mIdx })
                    }
                    onRenameLesson={(
                      dIdx: number,
                      mIdx: number,
                      title: string,
                    ) => renameLesson(wIdx, dIdx, mIdx, title)}
                    onRemoveLesson={(dIdx: number, mIdx: number) =>
                      removeLesson(wIdx, dIdx, mIdx)
                    }
                    onDragEndDays={(e: DragEndEvent) =>
                      handleDragEndDays(e, wIdx)
                    }
                    onDragEndLessons={(e: DragEndEvent, dIdx: number) =>
                      handleDragEndLessons(e, wIdx, dIdx)
                    }
                  />
                );
              })}
            {!sidebarCollapsed &&
              (!form.curriculum || form.curriculum.length === 0) && (
                <div className="text-center py-8 text-muted text-xs">
                  <p>No weeks yet.</p>
                  <button
                    type="button"
                    onClick={addWeek}
                    className="mt-2 text-primary font-semibold hover:underline"
                  >
                    + Add Week
                  </button>
                </div>
              )}
            {sidebarCollapsed && (
              <div className="flex flex-col items-center gap-4 mt-4">
                <span
                  className="text-xs font-bold tracking-widest uppercase text-muted"
                  style={{ writingMode: "vertical-rl" }}
                >
                  Curriculum
                </span>
              </div>
            )}
          </div>

          {/* BOTTOM SIDEBAR SECTION */}
          <div className="p-3 border-t border-default bg-surface shrink-0 flex flex-col items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center justify-center p-2 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all ${sidebarCollapsed ? "w-10 h-10" : "w-full gap-2 text-xs font-semibold"}`}
                >
                  <HelpCircle className="size-5" />
                  {!sidebarCollapsed && <span>Builder Help</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Learn how to use the curriculum builder
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-colors"
          style={{
            backgroundColor:
              activeModule?.pageBgColor || "var(--bg-subtle, #f8fafc)",
          }}
        >
          <div className="p-4 border-b border-default bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {activeModule &&
                (() => {
                  const m = getModuleTypeMeta(activeModule.type);
                  return (
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.bg} ${m.color}`}
                    >
                      <m.Icon className="size-3" />
                      {m.label}
                    </span>
                  );
                })()}
              <h2 className="text-lg font-display font-bold">
                {activeDay && activeModule
                  ? `${activeDay.title || activeDay.label} / ${activeModule.title}`
                  : activeDay
                    ? `${activeDay.title || activeDay.label} - Content`
                    : "Select a Lesson"}
              </h2>
            </div>
            {activeDay &&
              activeModule?.type !== "quiz" &&
              activeModule?.type !== "assignment" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted">
                    {activeSections.length} Sections
                  </span>
                </div>
              )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 relative">
            {!activeDay ? (
              <div className="h-full flex flex-col items-center justify-center text-muted">
                <p>
                  Select a lesson from the left sidebar to edit its content.
                </p>
              </div>
            ) : activeModule?.type === "quiz" ? (
              /* QUIZ EDITOR */
              <div className="max-w-3xl mx-auto pb-20">
                <QuizModuleEditor
                  quizData={
                    activeModule.quizData || { questions: [], passingScore: 70 }
                  }
                  onChange={(data) => {
                    if (!activeNode) return;
                    const next = structuredClone(form.curriculum);
                    next[activeNode.wIdx].days[activeNode.dIdx].subModules[
                      activeNode.mIdx ?? 0
                    ].quizData = data;
                    update("curriculum", next);
                  }}
                />
              </div>
            ) : activeModule?.type === "assignment" ? (
              /* ASSIGNMENT STUDENT PREVIEW in center */
              <div className="max-w-4xl mx-auto pb-20 space-y-5">
                {/* Preview header */}
                <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
                  <ClipboardList className="size-4 text-orange-600 shrink-0" />
                  <span className="text-xs font-bold text-orange-700">
                    Student Preview — edit settings in the right panel
                  </span>
                </div>

                {/* Assignment card */}
                <div className="rounded-2xl border border-default bg-surface p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100">
                      <ClipboardList className="size-5 text-orange-600" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                        Assignment
                      </p>
                      <h2 className="font-display text-lg font-bold text-foreground">
                        {activeModule.assignmentData?.title ||
                          activeModule.title ||
                          "Untitled Assignment"}
                      </h2>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeModule.assignmentData?.dueDate && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-semibold">
                        Due:{" "}
                        {new Date(
                          activeModule.assignmentData.dueDate,
                        ).toLocaleString()}
                      </span>
                    )}
                    {activeModule.assignmentData?.totalMarks !== undefined && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs text-purple-700 font-semibold">
                        {activeModule.assignmentData.totalMarks} marks
                      </span>
                    )}
                    {(
                      activeModule.assignmentData?.allowedSubmissionTypes || []
                    ).map((t: string) => (
                      <span
                        key={t}
                        className="rounded-full bg-surface border border-default px-2.5 py-1 text-[10px] font-bold text-muted uppercase tracking-wider"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Instructions */}
                  {activeModule.assignmentData?.instructions ? (
                    <div
                      className="prose prose-sm max-w-none text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: activeModule.assignmentData.instructions,
                      }}
                    />
                  ) : (
                    <p className="text-muted text-sm italic">
                      No instructions added yet.
                    </p>
                  )}

                  {/* Attached files preview */}
                  {(activeModule.assignmentData?.attachedFiles || []).length >
                    0 && (
                    <div className="mt-5 pt-4 border-t border-default space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted">
                        Reference Materials
                      </p>
                      <div className="space-y-1.5">
                        {(
                          activeModule.assignmentData.attachedFiles as any[]
                        ).map((f: any, i: number) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                          >
                            <FileText className="size-3.5 shrink-0" />
                            {f.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reference links preview */}
                  {(activeModule.assignmentData?.referenceLinks || []).length >
                    0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted">
                        Reference Links
                      </p>
                      <div className="space-y-1">
                        {(
                          activeModule.assignmentData.referenceLinks as any[]
                        ).map((l: any, i: number) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="size-3.5 shrink-0" />
                            {l.label || l.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submission area preview */}
                <div className="rounded-2xl border border-default bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted mb-3">
                    Submission Area (student view)
                  </p>
                  <div className="space-y-3 opacity-60 pointer-events-none">
                    {(
                      activeModule.assignmentData?.allowedSubmissionTypes || [
                        "text",
                      ]
                    ).includes("text") && (
                      <textarea
                        rows={4}
                        className="w-full rounded-xl border border-default bg-surface p-3 text-sm resize-none"
                        placeholder="Student types answer here..."
                        readOnly
                      />
                    )}
                    {(
                      activeModule.assignmentData?.allowedSubmissionTypes || []
                    ).includes("url") && (
                      <input
                        className="w-full rounded-xl border border-default bg-surface px-3 py-2.5 text-sm"
                        placeholder="https://..."
                        readOnly
                      />
                    )}
                    {((
                      activeModule.assignmentData?.allowedSubmissionTypes || []
                    ).includes("file") ||
                      (
                        activeModule.assignmentData?.allowedSubmissionTypes ||
                        []
                      ).includes("image")) && (
                      <div className="rounded-xl border-2 border-dashed border-default bg-surface p-6 text-center text-xs text-muted">
                        Drop files here or click to upload
                      </div>
                    )}
                  </div>
                </div>

                {activeModule.assignmentData?.requiresApproval && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 font-semibold">
                    <Lock className="size-4 shrink-0" />
                    Next day is locked until this assignment is approved by an
                    admin.
                  </div>
                )}
              </div>
            ) : (
              /* LESSON EDITOR */
              <div
                className={`max-w-3xl mx-auto space-y-6 pb-20 ${
                  activeModule?.pagePadding === "sm"
                    ? "px-4 sm:px-8"
                    : activeModule?.pagePadding === "md"
                      ? "px-6 sm:px-12"
                      : activeModule?.pagePadding === "lg"
                        ? "px-8 sm:px-16 lg:px-24"
                        : activeModule?.pagePadding === "xl"
                          ? "px-10 sm:px-20 lg:px-32"
                          : ""
                }`}
              >
                {/* Sections List */}
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndSections}
                >
                  <SortableContext
                    items={activeSections.map((s: any) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-0">
                      {activeSections.map((section: any, idx: number) => (
                        <div
                          key={section.id}
                          className="relative group/wrapper"
                        >
                          <SortableSectionItem
                            section={section}
                            isActive={activeSectionId === section.id}
                            onClick={() => setActiveSectionId(section.id)}
                            onRemove={() => removeSection(section.id)}
                            pageBgColor={activeModule?.pageBgColor}
                          />
                          {/* Add button between sections (hover on wrapper) */}
                          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
                            <div className="bg-surface border border-default shadow-sm rounded-full p-1 flex items-center gap-1 group/add">
                              <Plus className="size-4 text-muted group-hover/add:hidden" />
                              <div className="hidden group-hover/add:flex items-center gap-1">
                                {SECTION_TYPES.map((t) => (
                                  <button
                                    type="button"
                                    key={t.type}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addSection(t.type, idx);
                                    }}
                                    className="p-1.5 hover:bg-subtle rounded-full text-primary transition-colors"
                                    title={`Add ${t.label}`}
                                  >
                                    <t.Icon className="size-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add Section Buttons */}
                <div className="border border-dashed border-default rounded-xl p-6 bg-surface/50 text-center mt-8">
                  <p className="text-sm text-muted mb-4 font-medium">
                    Add new section
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SECTION_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.type}
                        onClick={() => addSection(t.type)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-default bg-surface hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                      >
                        <t.Icon className="size-4 text-primary" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Section Editor */}
        <div className="w-80 border-l border-default bg-surface flex flex-col shrink-0">
          <div className="p-4 border-b border-default flex items-center">
            <h3 className="font-bold">Section Editor</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {/* Assignment: right panel = editor */}
            {activeModule?.type === "assignment" ? (
              <AssignmentModuleEditor
                moduleId={activeModule.id}
                assignmentData={
                  activeModule.assignmentData || {
                    title: "",
                    instructions: "",
                    allowedSubmissionTypes: ["text"],
                    requiresApproval: true,
                  }
                }
                onChange={(data) => {
                  if (!activeNode) return;
                  const next = structuredClone(form.curriculum);
                  next[activeNode.wIdx].days[activeNode.dIdx].subModules[
                    activeNode.mIdx ?? 0
                  ].assignmentData = data;
                  if (data.title)
                    next[activeNode.wIdx].days[activeNode.dIdx].subModules[
                      activeNode.mIdx ?? 0
                    ].title = data.title;
                  update("curriculum", next);
                }}
              />
            ) : !activeSection ? (
              activeModule ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted border-b border-default pb-2">
                    Page Settings
                  </h4>

                  {/* Page Background Color Picker */}
                  <div className="space-y-1 mt-4">
                    <label className="block text-xs font-bold text-muted mb-1">
                      Page Background Color
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative size-8 rounded-md overflow-hidden border border-default shadow-sm shrink-0">
                        <input
                          type="color"
                          value={activeModule?.pageBgColor || "#f8fafc"}
                          onChange={(e) =>
                            updateModule({ pageBgColor: e.target.value })
                          }
                          className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateModule({ pageBgColor: "" })}
                        className="text-xs font-semibold text-muted hover:text-red-500"
                      >
                        Reset to Default
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-4">
                    <label className="block text-xs font-bold text-muted mb-1">
                      Page Padding (Horizontal)
                    </label>
                    <div className="flex bg-surface rounded-lg p-1 border border-default flex-wrap gap-1">
                      {["none", "sm", "md", "lg", "xl"].map((p) => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => updateModule({ pagePadding: p })}
                          className={`flex-1 min-w-[45px] py-1.5 px-2 text-[8px] font-semibold rounded-md ${activeModule?.pagePadding === p || (!activeModule?.pagePadding && p === "none") ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                        >
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted mt-2 leading-relaxed">
                      Adjusts horizontal padding for the entire document page in
                      the student view.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted text-center text-sm px-4">
                  <p>
                    Select a lesson to view Page Settings, or select a section
                    to edit its properties.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {/* dynamic editor based on activeSection.type */}
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted border-b border-default pb-2">
                  {SECTION_TYPES.find((t) => t.type === activeSection.type)
                    ?.label || "Section"}{" "}
                  Settings
                </h4>

                {/* Section Background Color Picker */}
                <div className="space-y-1 pb-4 border-b border-default">
                  <label className="block text-xs font-bold text-muted mb-1">
                    Section Background Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative size-8 rounded-md overflow-hidden border border-default shadow-sm shrink-0">
                      <input
                        type="color"
                        value={activeSection.bgColor || "#ffffff"}
                        onChange={(e) =>
                          updateSection({ bgColor: e.target.value })
                        }
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSection({ bgColor: "" })}
                      className="text-xs font-semibold text-muted hover:text-red-500"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>

                {/* Global Alignment Setting */}
                <div className="space-y-1 pb-4 border-b border-default">
                  <label className="block text-xs font-bold text-muted">
                    Content Alignment
                  </label>
                  <div className="flex bg-surface rounded-lg p-1 border border-default">
                    <button
                      type="button"
                      onClick={() => updateSection({ align: "left" })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${activeSection.align === "left" || !activeSection.align ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSection({ align: "center" })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${activeSection.align === "center" ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSection({ align: "right" })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${activeSection.align === "right" ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                    >
                      Right
                    </button>
                  </div>
                </div>

                {/* Section Horizontal Padding */}
                <div className="space-y-1 pb-4 border-b border-default">
                  <label className="block text-xs font-bold text-muted">
                    Horizontal Padding
                  </label>
                  <div className="flex bg-surface rounded-lg p-1 border border-default overflow-x-auto">
                    {(["none", "sm", "md", "lg", "xl"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateSection({ paddingX: p })}
                        className={`flex-1 min-w-[45px] py-1.5 px-2 text-[10px] font-semibold rounded-md transition-colors ${activeSection.paddingX === p || (!activeSection.paddingX && p === "md") ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                      >
                        {p === "none" ? "None" : p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {activeSection.type === "rich_text" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">
                      Use the rich text editor to format your content.
                    </p>
                    <div className="bg-white relative z-50">
                      <RichTextEditor
                        key={activeSection.id}
                        value={activeSection.content}
                        onChange={(v) => updateSection({ content: v })}
                      />
                    </div>
                  </div>
                )}

                {activeSection.type === "image" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Image URL
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.url}
                        onChange={(e) => updateSection({ url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Upload Image
                      </label>
                      <FileUploader
                        folder={`lessons/${activeDay?.id}/images`}
                        files={
                          activeSection.url
                            ? [
                                {
                                  url: activeSection.url,
                                  name: "image",
                                  type: "image/*",
                                },
                              ]
                            : []
                        }
                        onChange={(files) => {
                          if (files.length)
                            updateSection({ url: files[0].url });
                        }}
                        role="admin"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Caption
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.caption || ""}
                        onChange={(e) =>
                          updateSection({ caption: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Caption Alignment
                      </label>
                      <div className="flex bg-surface rounded-lg p-1 border border-default">
                        <button
                          type="button"
                          onClick={() =>
                            updateSection({ captionAlign: "left" })
                          }
                          className={`flex-1 py-1 text-xs font-semibold rounded-md ${activeSection.captionAlign === "left" || (!activeSection.captionAlign && (activeSection.align === "left" || !activeSection.align)) ? "bg-white shadow-sm border border-default text-primary" : "text-muted"}`}
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSection({ captionAlign: "center" })
                          }
                          className={`flex-1 py-1 text-xs font-semibold rounded-md ${activeSection.captionAlign === "center" || (!activeSection.captionAlign && activeSection.align === "center") ? "bg-white shadow-sm border border-default text-primary" : "text-muted"}`}
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSection({ captionAlign: "right" })
                          }
                          className={`flex-1 py-1 text-xs font-semibold rounded-md ${activeSection.captionAlign === "right" || (!activeSection.captionAlign && activeSection.align === "right") ? "bg-white shadow-sm border border-default text-primary" : "text-muted"}`}
                        >
                          Right
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Image Size
                      </label>
                      <div className="flex bg-surface rounded-lg p-1 border border-default">
                        {["sm", "md", "lg", "full"].map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => updateSection({ size: s as any })}
                            className={`flex-1 py-1 text-xs font-semibold rounded-md ${activeSection.size === s || (!activeSection.size && s === "full") ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection.type === "video" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Video Title
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.title || ""}
                        onChange={(e) =>
                          updateSection({ title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        YouTube URL or ID
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.url}
                        onChange={(e) => updateSection({ url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Video Size
                      </label>
                      <div className="flex bg-surface rounded-lg p-1 border border-default">
                        {["sm", "md", "lg", "full"].map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => updateSection({ size: s as any })}
                            className={`flex-1 py-1 text-xs font-semibold rounded-md ${activeSection.size === s || (!activeSection.size && s === "lg") ? "bg-white shadow-sm border border-default text-primary" : "text-muted hover:text-foreground"}`}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection.type === "pdf" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Document Title
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.filename || ""}
                        onChange={(e) =>
                          updateSection({ filename: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Upload PDF
                      </label>
                      <FileUploader
                        folder={`lessons/${activeDay?.id}/pdfs`}
                        files={
                          activeSection.url
                            ? [
                                {
                                  url: activeSection.url,
                                  name:
                                    activeSection.filename || "document.pdf",
                                  type: "application/pdf",
                                },
                              ]
                            : []
                        }
                        onChange={(files) => {
                          if (files.length) {
                            updateSection({
                              url: files[0].url,
                              filename: files[0].name,
                            });
                          }
                        }}
                        role="admin"
                      />
                    </div>
                  </div>
                )}

                {activeSection.type === "link" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Link Title
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.title || ""}
                        onChange={(e) =>
                          updateSection({ title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        URL
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.url || ""}
                        onChange={(e) => updateSection({ url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary resize-y"
                        value={activeSection.description || ""}
                        onChange={(e) =>
                          updateSection({ description: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {activeSection.type === "task" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Task Title
                      </label>
                      <input
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.title || ""}
                        onChange={(e) =>
                          updateSection({ title: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Instructions / Description
                      </label>
                      <textarea
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary resize-y min-h-[100px]"
                        value={activeSection.description || ""}
                        onChange={(e) =>
                          updateSection({ description: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Submission Type
                      </label>
                      <select
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary bg-surface"
                        value={activeSection.submissionType || "url"}
                        onChange={(e) =>
                          updateSection({ submissionType: e.target.value })
                        }
                      >
                        <option value="url">URL Link</option>
                        <option value="file">File Upload</option>
                        <option value="text">Text Response</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted mb-1">
                        Deadline (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary"
                        value={activeSection.deadline || ""}
                        onChange={(e) =>
                          updateSection({ deadline: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                {(activeSection as any).type === "columns" &&
                  (() => {
                    const s = activeSection as any;
                    const colCount: 2 | 3 = s.columnCount || 2;
                    const cols: any[] = s.cols || [];
                    const inputCls =
                      "w-full border border-default rounded px-3 py-2 text-sm outline-none focus:border-primary";
                    const colTypes = [
                      { type: "rich_text", label: "Rich Text" },
                      { type: "image", label: "Image" },
                      { type: "video", label: "Video" },
                      { type: "pdf", label: "PDF" },
                      { type: "link", label: "Link" },
                    ];
                    function mkCol(type: string) {
                      const id = `c_${Math.random().toString(36).slice(2, 8)}`;
                      switch (type) {
                        case "rich_text":
                          return { id, type, content: "" };
                        case "image":
                          return {
                            id,
                            type,
                            url: "",
                            caption: "",
                            size: "full",
                          };
                        case "video":
                          return { id, type, url: "", title: "" };
                        case "pdf":
                          return { id, type, url: "", filename: "" };
                        case "link":
                          return {
                            id,
                            type,
                            title: "",
                            url: "",
                            description: "",
                            thumbnailUrl: "",
                          };
                        default:
                          return { id, type: "rich_text", content: "" };
                      }
                    }
                    const setN = (n: 2 | 3) => {
                      const next = [...cols];
                      while (next.length < n) next.push(mkCol("rich_text"));
                      updateSection({
                        columnCount: n,
                        cols: next.slice(0, n),
                      } as any);
                    };
                    const safeCols = [
                      cols[0] || mkCol("rich_text"),
                      cols[1] || mkCol("rich_text"),
                    ];
                    const patchCol = (i: number, f: any) =>
                      updateSection({
                        cols: safeCols.map((c: any, ci: number) =>
                          ci === i ? { ...c, ...f } : c,
                        ),
                      } as any);
                    const changeType = (i: number, t: string) =>
                      updateSection({
                        cols: safeCols.map((c: any, ci: number) =>
                          ci === i ? { ...mkCol(t), id: c.id } : c,
                        ),
                      } as any);

                    const activeColIdx = activeColTab < 2 ? activeColTab : 0;
                    const activeCol = safeCols[activeColIdx];

                    return (
                      <div className="space-y-4">
                        <div className="flex bg-surface rounded-lg p-1 border border-default">
                          {[0, 1].map((idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveColTab(idx)}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                activeColIdx === idx
                                  ? "bg-primary text-white shadow-sm"
                                  : "text-muted hover:text-foreground hover:bg-black/5"
                              }`}
                            >
                              Column {idx + 1}
                            </button>
                          ))}
                        </div>

                        <div className="rounded-lg border border-default bg-white overflow-hidden">
                          <div className="flex items-center gap-2 bg-surface px-3 py-2 border-b border-default">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                              Type
                            </span>
                            <select
                              value={activeCol.type}
                              onChange={(e: any) =>
                                changeType(activeColIdx, e.target.value)
                              }
                              className="ml-auto text-[10px] font-semibold border border-default rounded px-2 py-0.5 bg-white text-secondary focus:outline-none focus:border-primary"
                            >
                              {colTypes.map((t: any) => (
                                <option key={t.type} value={t.type}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="p-2.5 space-y-2">
                            {activeCol.type === "rich_text" && (
                              <div className="bg-white relative z-50">
                                <RichTextEditor
                                  key={`${activeSection.id}-col-${activeColIdx}`}
                                  value={activeCol.content || ""}
                                  onChange={(v: string) =>
                                    patchCol(activeColIdx, { content: v })
                                  }
                                  placeholder={`Column ${activeColIdx + 1}…`}
                                />
                              </div>
                            )}
                            {activeCol.type === "image" && (
                              <>
                                {activeCol.url && (
                                  <Image
                                    src={activeCol.url}
                                    alt=""
                                    width={400}
                                    height={112}
                                    unoptimized
                                    className="max-h-28 w-full object-contain rounded border border-default"
                                  />
                                )}
                                <input
                                  value={activeCol.url || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="Image URL…"
                                  className={inputCls}
                                />
                                <FileUploader
                                  folder={`lessons/${activeDay?.id}/images`}
                                  files={
                                    activeCol.url
                                      ? [
                                          {
                                            url: activeCol.url,
                                            name: "image",
                                            type: "image/*",
                                          },
                                        ]
                                      : []
                                  }
                                  onChange={(files: any[]) => {
                                    if (files.length)
                                      patchCol(activeColIdx, {
                                        url: files[0].url,
                                      });
                                  }}
                                  role="admin"
                                />
                                <input
                                  value={activeCol.caption || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      caption: e.target.value,
                                    })
                                  }
                                  placeholder="Caption"
                                  className={inputCls}
                                />
                                <select
                                  value={activeCol.size || "full"}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      size: e.target.value,
                                    })
                                  }
                                  className={inputCls}
                                >
                                  <option value="sm">Small</option>
                                  <option value="md">Medium</option>
                                  <option value="lg">Large</option>
                                  <option value="full">Full</option>
                                </select>
                              </>
                            )}
                            {activeCol.type === "video" && (
                              <>
                                <input
                                  value={activeCol.url || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="YouTube / Vimeo URL…"
                                  className={inputCls}
                                />
                                <input
                                  value={activeCol.title || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="Title (optional)"
                                  className={inputCls}
                                />
                              </>
                            )}
                            {activeCol.type === "pdf" && (
                              <>
                                <input
                                  value={activeCol.url || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="PDF URL…"
                                  className={inputCls}
                                />
                                <FileUploader
                                  folder={`lessons/${activeDay?.id}/pdfs`}
                                  files={
                                    activeCol.url
                                      ? [
                                          {
                                            url: activeCol.url,
                                            name:
                                              activeCol.filename || "doc.pdf",
                                            type: "application/pdf",
                                          },
                                        ]
                                      : []
                                  }
                                  onChange={(files: any[]) => {
                                    if (files.length)
                                      patchCol(activeColIdx, {
                                        url: files[0].url,
                                        filename: files[0].name,
                                      });
                                  }}
                                  role="admin"
                                />
                                <input
                                  value={activeCol.filename || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      filename: e.target.value,
                                    })
                                  }
                                  placeholder="Filename"
                                  className={inputCls}
                                />
                              </>
                            )}
                            {activeCol.type === "link" && (
                              <>
                                <input
                                  value={activeCol.title || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="Link title…"
                                  className={inputCls}
                                />
                                <input
                                  value={activeCol.url || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      url: e.target.value,
                                    })
                                  }
                                  placeholder="https://…"
                                  className={inputCls}
                                />
                                <input
                                  value={activeCol.description || ""}
                                  onChange={(e: any) =>
                                    patchCol(activeColIdx, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Description (optional)"
                                  className={inputCls}
                                />
                                <div className="mt-2 space-y-1">
                                  <label className="text-[9px] font-bold uppercase text-muted">
                                    Icon / Thumbnail
                                  </label>
                                  <FileUploader
                                    folder={`lessons/${activeDay?.id}/links`}
                                    files={
                                      activeCol.thumbnailUrl
                                        ? [
                                            {
                                              url: activeCol.thumbnailUrl,
                                              name: "icon",
                                              type: "image/*",
                                            },
                                          ]
                                        : []
                                    }
                                    onChange={(files) => {
                                      if (files.length) {
                                        patchCol(activeColIdx, {
                                          thumbnailUrl: files[0].url,
                                        });
                                      }
                                    }}
                                    role="admin"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>

          {/* Sticky footer: Save + Cancel */}
          <div className="shrink-0 border-t border-default p-3 bg-surface flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSave();
              }}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-default bg-white text-sm font-semibold text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
