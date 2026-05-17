"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Save,
  CheckCircle2,
  Info,
  BookOpen,
  User,
  Settings2,
  Target,
  ImageIcon,
  Copy,
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import Link from "next/link";
import { QuizBuilder } from "@/components/admin/quiz-builder";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SortableDayItem } from "@/components/admin/sortable-day-item";
import { ThreePanelCurriculumBuilder } from "@/components/admin/three-panel-curriculum-builder"; // ADDED
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { CourseImageUploader } from "@/components/admin/course-image-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CourseRow = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  instructor: string;
  instructor_bio: string;
  duration: string;
  total_modules: number;
  level: string;
  color: string;
  icon: string;
  outcomes: string[];
  is_active: boolean;
  image: string;
  curriculum: any[];
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "All Levels"];

function WeekJsonEditor({
  week,
  onSave,
}: {
  week: any;
  onSave: (data: any) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [input, setInput] = useState(() => JSON.stringify(week, null, 2));
  const [err, setErr] = useState("");

  useEffect(() => {
    if (collapsed) {
      setInput(JSON.stringify(week, null, 2));
    }
  }, [week, collapsed]);

  return (
    <div className="rounded-xl border border-default bg-white overflow-hidden shadow-sm transition-all">
      <div className="flex items-center justify-between bg-surface px-4 py-3 border-b border-default">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted hover:text-primary p-1"
          >
            {collapsed ? (
              <ChevronRight className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </button>
          <span className="font-bold text-primary text-sm">{week.title}</span>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-green-800 font-semibold flex items-center gap-1 transition-colors"
            onClick={() => {
              try {
                const p = JSON.parse(input);
                onSave(p);
                setErr("");
                setCollapsed(true);
              } catch (e) {
                setErr("Invalid JSON format");
              }
            }}
          >
            <Save className="size-3" /> Save JSON
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="p-4 bg-[#fafafa]">
          <textarea
            className="w-full h-[350px] font-mono text-xs p-4 rounded-xl border border-default bg-white outline-none focus:border-primary shadow-inner resize-y"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
          />
          {err && (
            <p className="text-red-500 text-xs mt-2 font-semibold bg-red-50 p-2 rounded">
              {err}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseNewPage() {
  const router = useRouter();

  // Initialize empty form
  const [form, setForm] = useState<Partial<CourseRow>>({
    id: "",
    title: "",
    tagline: "",
    description: "",
    instructor: "",
    instructor_bio: "",
    duration: "",
    image: "",

    total_modules: 0,
    level: "Beginner",
    color: "--course-default",
    icon: "Book",
    outcomes: [],
    is_active: true,
    curriculum: [],
  });

  const [activeTab, setActiveTab] = useState<"settings" | "curriculum">(
    "settings",
  );
  const [showJson, setShowJson] = useState(false);
  const [showJsonHelp, setShowJsonHelp] = useState(false);
  const [jsonMode, setJsonMode] = useState<"full" | "week" | "edit-weeks">(
    "full",
  );
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [outcomeInput, setOutcomeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [useThreePanel, setUseThreePanel] = useState(true); // ADDED
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>(
    {},
  );
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(
    {},
  );

  const [existingCourses, setExistingCourses] = useState<CourseRow[]>([]);
  const [importCourseId, setImportCourseId] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/courses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.courses) setExistingCourses(d.courses);
      })
      .catch(console.error);
  }, []);

  async function handleImport() {
    if (!importCourseId) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/admin/courses/${importCourseId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (
        data.course &&
        data.course.curriculum &&
        data.course.curriculum.length > 0
      ) {
        update("curriculum", data.course.curriculum);
        toast.success("Curriculum imported successfully!");
      } else {
        toast.error("No curriculum found in the selected course.");
      }
    } catch (err: any) {
      toast.error("Failed to import curriculum.");
    } finally {
      setImporting(false);
    }
  }

  function update(field: keyof CourseRow, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addOutcome() {
    const v = outcomeInput.trim();
    if (!v) return;
    update("outcomes", [...(form.outcomes ?? []), v]);
    setOutcomeInput("");
  }

  function removeOutcome(i: number) {
    update(
      "outcomes",
      (form.outcomes ?? []).filter((_, idx) => idx !== i),
    );
  }

  // Curriculum Helpers
  function addWeek() {
    const weeks = [...(form.curriculum ?? [])];
    const nextIndex = weeks.length + 1;
    weeks.push({
      id: `week-${nextIndex}`,
      title: `Week ${nextIndex}: New Week`,
      isLocked: nextIndex > 1,
      days: [],
    });
    update("curriculum", weeks);
  }

  function addDay(weekIndex: number) {
    const weeks = [...(form.curriculum ?? [])];
    const dayIndex = weeks[weekIndex].days.length + 1;
    const courseIdPrefix = form.id || "new-course";
    weeks[weekIndex].days.push({
      id: `${courseIdPrefix}-w${weekIndex + 1}-d${dayIndex}`,
      label: `Day ${dayIndex}`,
      title: "New Day Topic",
      subModules: [],
    });
    update("curriculum", weeks);
  }

  function addModule(weekIndex: number, dayIndex: number) {
    const weeks = [...(form.curriculum ?? [])];
    const courseIdPrefix = form.id || "new-course";
    weeks[weekIndex].days[dayIndex].subModules.push({
      id: `${courseIdPrefix}-m-${Math.random().toString(36).substr(2, 5)}`,
      title: "New Lesson",
      type: "video",
      duration: "10 min",
      description: "Lesson description here.",
    });
    update("curriculum", weeks);
  }

  function removeWeek(idx: number) {
    const weeks = (form.curriculum ?? []).filter((_, i) => i !== idx);
    update("curriculum", weeks);
  }

  function removeDay(weekIdx: number, dayIdx: number) {
    const weeks = [...(form.curriculum ?? [])];
    weeks[weekIdx].days = weeks[weekIdx].days.filter(
      (_: any, i: number) => i !== dayIdx,
    );
    update("curriculum", weeks);
  }

  function removeModule(weekIdx: number, dayIdx: number, modIdx: number) {
    const weeks = [...(form.curriculum ?? [])];
    weeks[weekIdx].days[dayIdx].subModules = weeks[weekIdx].days[
      dayIdx
    ].subModules.filter((_: any, i: number) => i !== modIdx);
    update("curriculum", weeks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.id?.trim()) {
      setError("Course ID is required.");
      return;
    }

    if (!form.title?.trim()) {
      setError("Course Title is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      toast.success("Course created successfully!");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push("/admin/courses");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to create course. Please try again.");
      setError(err.message || "Failed to create course. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const sectionClass =
    "rounded-xl border border-default bg-white p-6 space-y-5";

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/admin/courses"
          className="rounded-lg border border-[#e5e2da] p-2 hover:bg-[#f5f5f0]"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Create New Course
          </h1>
          <p className="text-sm text-[#7a7a62]">
            Fill out the details to add a new course to the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#f0ede6] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${activeTab === "settings" ? "bg-white text-[#1a4031] shadow-sm" : "text-[#7a7a62] hover:text-[#1a4031]"}`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curriculum")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${activeTab === "curriculum" ? "bg-white text-[#1a4031] shadow-sm" : "text-[#7a7a62] hover:text-[#1a4031]"}`}
          >
            Curriculum
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* 1. Basic Info */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <BookOpen className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Basic Information
                </h2>
              </div>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Course ID (Slug) *
                    </label>
                    <input
                      value={form.id ?? ""}
                      onChange={(e) =>
                        update(
                          "id",
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                      required
                      className={inputClass}
                      placeholder="e.g. advanced-react"
                    />
                    <p className="mt-1 text-xs text-[#7a7a62]">
                      Used in URLs. Letters, numbers, and hyphens only.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Course Title *
                    </label>
                    <input
                      value={form.title ?? ""}
                      onChange={(e) => update("title", e.target.value)}
                      required
                      className={inputClass}
                      placeholder="e.g. Advanced React Patterns"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Tagline
                  </label>
                  <input
                    value={form.tagline ?? ""}
                    onChange={(e) => update("tagline", e.target.value)}
                    className={inputClass}
                    placeholder="A short catchy line for the course card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description ?? ""}
                    onChange={(e) => update("description", e.target.value)}
                    className={inputClass}
                    placeholder="Full course description..."
                  />
                </div>
              </div>

              {/* Course Thumbnail */}
              <div className={sectionClass}>
                <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                  <ImageIcon className="size-4 text-[#1a4031]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                    Course Thumbnail
                  </h2>
                </div>
                <CourseImageUploader
                  value={form.image ?? ""}
                  onChange={(url) => update("image", url)}
                />
                <p className="text-xs text-[#7a7a62]">
                  Displayed on the course card and detail page. Recommended:
                  1280×720px (16:9).
                </p>
              </div>
            </div>

            {/* 2. Course Details */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <Settings2 className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Course Details
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Duration
                  </label>
                  <input
                    value={form.duration ?? ""}
                    onChange={(e) => update("duration", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 8 Weeks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Total Modules
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.total_modules ?? ""}
                    onChange={(e) =>
                      update("total_modules", Number(e.target.value))
                    }
                    className={inputClass}
                    placeholder="e.g. 32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Difficulty Level
                  </label>
                  <Select
                    value={form.level ?? ""}
                    onValueChange={(v) => update("level", v)}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="-- Select Level --" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Color CSS Variable
                  </label>
                  <input
                    value={form.color ?? ""}
                    onChange={(e) => update("color", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. --course-mern"
                  />
                </div>
              </div>
            </div>

            {/* 3. Instructor */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <User className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Instructor
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Instructor Name
                  </label>
                  <input
                    value={form.instructor ?? ""}
                    onChange={(e) => update("instructor", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Dr. Sarah Chen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Instructor Bio
                  </label>
                  <textarea
                    rows={3}
                    value={form.instructor_bio ?? ""}
                    onChange={(e) => update("instructor_bio", e.target.value)}
                    className={inputClass}
                    placeholder="Short bio about the instructor..."
                  />
                </div>
              </div>
            </div>

            {/* 4. Outcomes */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <Target className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Learning Outcomes
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.outcomes ?? []).map((o, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-[#e8f0ec] px-3 py-1.5 text-xs font-medium text-[#1a4031]"
                  >
                    {o}
                    <button
                      type="button"
                      onClick={() => removeOutcome(i)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={outcomeInput}
                  onChange={(e) => setOutcomeInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addOutcome())
                  }
                  placeholder="Add outcome..."
                  className="flex-1 rounded-lg border border-[#e5e2da] bg-[#f9f9f6] px-3 py-2 text-sm outline-none focus:border-[#1a4031]"
                />
                <button
                  type="button"
                  onClick={addOutcome}
                  className="flex items-center gap-1 rounded-lg bg-[#1a4031]/10 px-3 py-2 text-sm font-semibold text-[#1a4031]"
                >
                  <Plus className="size-4" /> Add
                </button>
              </div>
            </div>

            {/* 5. Visibility */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <Info className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Visibility
                </h2>
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => update("is_active", e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[#e5e2da] accent-[#1a4031]"
                />
                <div>
                  <p className="text-sm font-semibold">
                    Active — visible to enrolled students
                  </p>
                  <p className="text-xs text-[#7a7a62] mt-0.5">
                    Inactive courses are hidden from the student portal.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === "curriculum" && (
          <div className="space-y-6">
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
                <Copy className="size-4 text-[#1a4031]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
                  Import Curriculum
                </h2>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1.5">
                    Copy from Existing Course
                  </label>
                  <Select
                    value={importCourseId}
                    onValueChange={setImportCourseId}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="-- Select Course --" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || !importCourseId}
                  className="px-4 py-2.5 bg-[#1a4031] text-white font-semibold text-sm rounded-lg hover:bg-[#1a4031]/90 disabled:opacity-50 transition-colors"
                >
                  {importing ? "Importing..." : "Import Weeks"}
                </button>
              </div>
              <p className="text-xs text-[#7a7a62]">
                Importing will replace any current curriculum draft you have
                here.
              </p>
            </div>

            {form.curriculum && form.curriculum.length > 0 ? (
              <div className="border border-default rounded-xl overflow-hidden bg-white min-h-[600px] h-[calc(100vh-200px)]">
                <ThreePanelCurriculumBuilder
                  courseId={form.id || "new-course"}
                  initialData={form.curriculum}
                  onChange={(data: any) => update("curriculum", data)}
                  onSave={() => {
                    toast.success(
                      "Curriculum draft saved. Hit Create Course to finalize.",
                    );
                  }}
                  onCancel={() => setActiveTab("settings")}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-default p-12 text-center bg-white">
                <p className="text-sm font-semibold text-foreground">
                  No Curriculum Yet
                </p>
                <p className="text-xs text-muted mt-1">
                  Import from an existing course above to prepopulate the
                  curriculum.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || success}
            className="flex items-center gap-2 rounded-lg bg-[#1a4031] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? (
              <>
                <RoboLoader size="xs" className="text-current" />
                Creating...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="size-4" />
                Created!
              </>
            ) : (
              <>
                <Save className="size-4" />
                Create Course
              </>
            )}
          </button>
          <Link
            href="/admin/courses"
            className="text-sm text-[#7a7a62] hover:text-[#1a4031]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
