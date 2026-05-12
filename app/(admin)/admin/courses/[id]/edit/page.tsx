"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, X, Save, CheckCircle2,
  Info, BookOpen, User, Settings2, Target, ArrowUp, ArrowDown
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import Link from "next/link";
import { QuizBuilder } from "@/components/admin/QuizBuilder";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CurriculumGuide } from "@/components/admin/CurriculumGuide";
import { LessonSectionEditor } from "@/components/admin/LessonSectionEditor";
import { SortableDayItem } from "@/components/admin/SortableDayItem";
import { FileUploader } from "@/components/ui/FileUploader";
import type { AttachedFile } from "@/components/ui/FileUploader";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type CourseRow = {
  id: string; title: string; tagline: string; description: string;
  instructor: string; instructor_bio: string; duration: string;
  total_modules: number; level: string; color: string; icon: string;
  outcomes: string[]; is_active: boolean;
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "All Levels"];


function WeekJsonEditor({ week, onSave }: { week: any, onSave: (data: any) => void }) {
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
           <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-muted hover:text-primary p-1">
             {collapsed ? <ChevronRight className="size-5" /> : <ChevronDown className="size-5" />}
           </button>
           <span className="font-bold text-primary text-sm">{week.title}</span>
        </div>
        {!collapsed && (
          <button type="button" className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-green-800 font-semibold flex items-center gap-1 transition-colors" onClick={() => {
             try {
                const p = JSON.parse(input);
                onSave(p);
                setErr("");
                setCollapsed(true);
             } catch(e) { setErr("Invalid JSON format"); }
          }}><Save className="size-3" /> Save JSON</button>
        )}
      </div>
      {!collapsed && (
        <div className="p-4 bg-[#fafafa]">
          <textarea className="w-full h-[350px] font-mono text-xs p-4 rounded-xl border border-default bg-white outline-none focus:border-primary shadow-inner resize-y" value={input} onChange={e => setInput(e.target.value)} spellCheck={false} />
          {err && <p className="text-red-500 text-xs mt-2 font-semibold bg-red-50 p-2 rounded">{err}</p>}
        </div>
      )}
    </div>
  );
}

export default function CourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Partial<CourseRow> & { curriculum?: any[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "curriculum">("settings");
  const [showJson, setShowJson] = useState(false);
  const [showJsonHelp, setShowJsonHelp] = useState(false);
  const [jsonMode, setJsonMode] = useState<"full" | "week" | "edit-weeks">("full");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [outcomeInput, setOutcomeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/courses", { credentials: "include" })
      .then((r) => r.json())
      .then(({ courses }) => {
        const course = courses.find((c: any) => c.id === id);
        if (course) setForm({ 
          ...course, 
          outcomes: course.outcomes ?? [], 
          curriculum: course.curriculum ?? [] 
        });
      });
  }, [id]);

  function update(field: keyof CourseRow | "curriculum", value: unknown) {
    setForm((prev: any) => prev ? { ...prev, [field]: value } : prev);
  }

  function addOutcome() {
    const v = outcomeInput.trim();
    if (!v) return;
    update("outcomes", [...(form?.outcomes ?? []), v]);
    setOutcomeInput("");
  }

  function removeOutcome(i: number) {
    update("outcomes", (form?.outcomes ?? []).filter((_, idx) => idx !== i));
  }

  // Curriculum Helpers
  function addWeek() {
    const weeks = [...(form?.curriculum ?? [])];
    const nextIndex = weeks.length + 1;
    weeks.push({
      id: `week-${nextIndex}`,
      title: `Week ${nextIndex}: New Week`,
      isLocked: nextIndex > 1,
      days: []
    });
    update("curriculum", weeks);
  }

  function addDay(weekIndex: number) {
    const weeks = [...(form?.curriculum ?? [])];
    const dayIndex = weeks[weekIndex].days.length + 1;
    weeks[weekIndex].days.push({
      id: `${id}-w${weekIndex + 1}-d${dayIndex}`,
      label: `Day ${dayIndex}`,
      title: "New Day Topic",
      subModules: []
    });
    update("curriculum", weeks);
  }

  function addModule(weekIndex: number, dayIndex: number) {
    const weeks = [...(form?.curriculum ?? [])];
    weeks[weekIndex].days[dayIndex].subModules.push({
      id: `${id}-m-${Math.random().toString(36).substr(2, 5)}`,
      title: "New Lesson",
      type: "video",
      duration: "10 min",
      description: "Lesson description here."
    });
    update("curriculum", weeks);
  }

  function removeWeek(idx: number) {
    const weeks = (form?.curriculum ?? []).filter((_: any, i: number) => i !== idx);
    update("curriculum", weeks);
  }

  function removeDay(weekIdx: number, dayIdx: number) {
    const weeks = [...(form?.curriculum ?? [])];
    weeks[weekIdx].days = weeks[weekIdx].days.filter((_: any, i: number) => i !== dayIdx);
    update("curriculum", weeks);
  }

  function removeModule(weekIdx: number, dayIdx: number, modIdx: number) {
    const weeks = [...(form?.curriculum ?? [])];
    weeks[weekIdx].days[dayIdx].subModules = weeks[weekIdx].days[dayIdx].subModules.filter((_: any, i: number) => i !== modIdx);
    update("curriculum", weeks);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setSuccess(true);
      setTimeout(() => { setSuccess(false); router.push("/admin/courses"); }, 1500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RoboLoader size="md" className="text-[#7a7a62]" />
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const sectionClass = "rounded-xl border border-default bg-white p-6 space-y-5";

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link href="/admin/courses" className="group flex items-center gap-2 text-sm font-semibold text-secondary transition-colors hover:text-primary focus-ring rounded mr-2">
          <span className="flex size-8 items-center justify-center rounded-full border border-default bg-white shadow-sm transition-all group-hover:border-primary group-hover:bg-primary/5">
            <ChevronLeft className="size-4" />
          </span>
          <span>Back to Courses</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit Course</h1>
          <p className="text-sm text-secondary">
            <span className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">{id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-subtle p-1">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${activeTab === "settings" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary"}`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curriculum")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${activeTab === "curriculum" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary"}`}
          >
            Curriculum
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "settings" ? (
          <div className="space-y-6">
            {/* 1. Basic Info */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-muted pb-3">
                <BookOpen className="size-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Basic Information</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Course Title *</label>
                  <input value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} required className={inputClass} placeholder="e.g. MERN Stack Development" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Tagline</label>
                  <input value={form.tagline ?? ""} onChange={(e) => update("tagline", e.target.value)} className={inputClass} placeholder="A short catchy line for the course card" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Description</label>
                  <textarea rows={4} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} className={inputClass} placeholder="Full course description..." />
                </div>
              </div>
            </div>

            {/* 2. Course Details */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-muted pb-3">
                <Settings2 className="size-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Course Details</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Duration</label>
                  <input value={form.duration ?? ""} onChange={(e) => update("duration", e.target.value)} className={inputClass} placeholder="e.g. 8 Weeks" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Total Modules</label>
                  <input type="number" min={0} value={form.total_modules ?? ""} onChange={(e) => update("total_modules", Number(e.target.value))} className={inputClass} placeholder="e.g. 32" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Difficulty Level</label>
                  <select value={form.level ?? ""} onChange={(e) => update("level", e.target.value)} className={inputClass}>
                    <option value="">-- Select Level --</option>
                    {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Color CSS Variable</label>
                  <input value={form.color ?? ""} onChange={(e) => update("color", e.target.value)} className={inputClass} placeholder="e.g. --course-mern" />
                </div>
              </div>
            </div>

            {/* 3. Instructor */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-muted pb-3">
                <User className="size-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Instructor</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Instructor Name</label>
                  <input value={form.instructor ?? ""} onChange={(e) => update("instructor", e.target.value)} className={inputClass} placeholder="e.g. Dr. Sarah Chen" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Instructor Bio</label>
                  <textarea rows={3} value={form.instructor_bio ?? ""} onChange={(e) => update("instructor_bio", e.target.value)} className={inputClass} placeholder="Short bio about the instructor..." />
                </div>
              </div>
            </div>

            {/* 4. Outcomes */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-muted pb-3">
                <Target className="size-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Learning Outcomes</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.outcomes ?? []).map((o, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-primary border border-default">
                    {o}
                    <button type="button" onClick={() => removeOutcome(i)} className="hover:text-red-600 transition-colors">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={outcomeInput}
                  onChange={(e) => setOutcomeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
                  placeholder="Add outcome..."
                  className="flex-1 rounded-lg border border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <button type="button" onClick={addOutcome} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <Plus className="size-4" /> Add
                </button>
              </div>
            </div>

            {/* 5. Visibility */}
            <div className={sectionClass}>
              <div className="flex items-center gap-2 border-b border-muted pb-3">
                <Info className="size-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Visibility</h2>
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => update("is_active", e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[#e5e2da] accent-[#1a4031]"
                />
                <div>
                  <p className="text-sm font-semibold">Active — visible to enrolled students</p>
                  <p className="text-xs text-muted mt-0.5">Inactive courses are hidden from the student portal.</p>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Course Curriculum</h2>
                <p className="text-sm text-secondary">Organize your content into weeks, days, and lessons.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!showJson || jsonMode !== "edit-weeks") {
                      setJsonError("");
                      setJsonMode("edit-weeks");
                      setShowJson(true);
                    } else {
                      setShowJson(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg bg-surface border border-default px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors"
                >
                  {showJson && jsonMode === "edit-weeks" ? "Visual Builder" : "Edit JSON by Week"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!showJson || jsonMode !== "week") {
                      setJsonInput("");
                      setJsonError("");
                      setJsonMode("week");
                      setShowJson(true);
                    } else {
                      setShowJson(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg bg-surface border border-default px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors"
                >
                  {showJson && jsonMode === "week" ? "Cancel Import" : "Import Week JSON"}
                </button>

                {!showJson && (
                  <button
                    type="button"
                    onClick={addWeek}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
                  >
                    <Plus className="size-4" /> Add Week
                  </button>
                )}
              </div>
            </div>

            {showJson ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-secondary">
                    {jsonMode === "edit-weeks" 
                      ? "Edit the JSON for each week individually below." 
                      : "Paste a single week JSON object here. It will be appended to the curriculum."}
                  </p>
                  <div className="flex items-center gap-4">
                    {jsonError && <p className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">{jsonError}</p>}
                    <button
                      type="button"
                      onClick={() => setShowJsonHelp(!showJsonHelp)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                    >
                      <Info className="size-4" /> Structure Guide
                    </button>
                  </div>
                </div>

                {showJsonHelp && (
                  <CurriculumGuide />
                )}

                {jsonMode === "edit-weeks" ? (
                  <div className="space-y-4">
                    {(form.curriculum ?? []).map((week: any, wIdx: number) => (
                      <WeekJsonEditor
                        key={week.id || wIdx}
                        week={week}
                        onSave={(parsed) => {
                          const next = [...form.curriculum!];
                          next[wIdx] = parsed;
                          update("curriculum", next);
                        }}
                      />
                    ))}
                    {(form.curriculum ?? []).length === 0 && (
                      <p className="text-sm text-muted text-center py-8">No weeks to edit. Add a week first.</p>
                    )}
                  </div>
                ) : (
                  <>
                    <textarea
                      className="w-full h-[400px] font-mono text-sm p-4 rounded-xl border border-default bg-surface outline-none focus:border-primary shadow-inner"
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder="Paste JSON here..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(jsonInput);
                          if (typeof parsed === "object" && !Array.isArray(parsed) && parsed !== null) {
                            update("curriculum", [...(form.curriculum ?? []), parsed]);
                            setJsonError("");
                            setShowJson(false);
                            setJsonInput(""); // clear for next import
                          } else {
                            setJsonError("JSON must be a single week object.");
                          }
                        } catch (err) {
                          setJsonError("Invalid JSON format.");
                        }
                      }}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
                    >
                      <CheckCircle2 className="size-4" /> Add Week from JSON
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {(form.curriculum ?? []).map((week: any, wIdx: number) => {
                  const isCollapsed = collapsedWeeks[wIdx];
                  return (
                    <div key={week.id} className="rounded-xl border border-default bg-white overflow-hidden shadow-sm transition-all">
                      <div className="flex items-center justify-between bg-surface px-4 py-3 border-b border-default">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() => setCollapsedWeeks(prev => ({ ...prev, [wIdx]: !prev[wIdx] }))}
                            className="text-muted hover:text-primary transition-colors p-1"
                          >
                            {isCollapsed ? <ChevronRight className="size-5" /> : <ChevronDown className="size-5" />}
                          </button>
                          <input
                            value={week.title}
                            onChange={(e) => {
                              const next = [...form.curriculum!];
                              next[wIdx].title = e.target.value;
                              update("curriculum", next);
                            }}
                            className="bg-transparent font-bold text-[#1a4031] outline-none focus:underline flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addDay(wIdx)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            + Add Day
                          </button>
                          <button
                            type="button"
                            onClick={() => removeWeek(wIdx)}
                            className="text-muted hover:text-red-600 p-1"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="p-4 space-y-4">
                          <DndContext
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => {
                              const { active, over } = event;
                              if (over && active.id !== over.id) {
                                const next = [...form.curriculum!];
                                const oldIndex = next[wIdx].days.findIndex((d: any) => d.id === active.id);
                                const newIndex = next[wIdx].days.findIndex((d: any) => d.id === over.id);
                                next[wIdx].days = arrayMove(next[wIdx].days, oldIndex, newIndex);
                                update("curriculum", next);
                              }
                            }}
                          >
                            <SortableContext items={week.days.map((d: any) => d.id)} strategy={verticalListSortingStrategy}>
                              {week.days.map((day: any, dIdx: number) => (
                                <SortableDayItem
                                  key={day.id}
                                  day={day}
                                  wIdx={wIdx}
                                  dIdx={dIdx}
                                  form={form}
                                  update={update}
                                  isDayCollapsed={collapsedDays[day.id]}
                                  setCollapsedDays={setCollapsedDays}
                                  removeDay={removeDay}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                    {week.days.length === 0 && (
                      <p className="text-sm text-center text-muted py-4 italic">This week is empty. Click "+ Add Day" to start.</p>
                    )}
                  </div>
                 )}
                </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || success}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <><RoboLoader size="xs" className="text-current" />Saving...</>
            ) : success ? (
              <><CheckCircle2 className="size-4" />Saved!</>
            ) : (
              <><Save className="size-4" />Save Changes</>
            )}
          </button>
          <Link href="/admin/courses" className="text-sm text-secondary hover:text-primary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
