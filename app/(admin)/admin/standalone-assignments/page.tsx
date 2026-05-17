"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, X, Save, Globe, BookOpen,
  Clock, CheckCircle2, Users, ChevronRight, Trash2, AlertCircle,
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { AssignmentModuleEditor } from "@/components/admin/AssignmentModuleEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import type { AssignmentSubModuleData } from "@/types";
import { StandaloneSubmissionsTab } from "./submissions-tab";

// ── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  title: string;
  scope: "course" | "common";
  course_id: string | null;
  course_title: string | null;
  student_count: number;
  created_at: string;
  due_date: string | null;
  instructions: string;
  allowed_submission_types: string[];
  attached_files: any[];
  reference_links: any[];
  total_marks: number | null;
}

interface CourseRow { id: string; title: string; }

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const inputCls = "w-full rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors";

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StandaloneAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "course" | "common">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"assignments" | "submissions">("assignments");

  // New assignment form state
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState<"course" | "common">("course");
  const [newCourseId, setNewCourseId] = useState("");
  const [newAssignmentData, setNewAssignmentData] = useState<AssignmentSubModuleData>({
    title: "",
    instructions: "",
    allowedSubmissionTypes: ["text"],
    requiresApproval: false,
    attachedFiles: [],
    referenceLinks: [],
  });
  const moduleId = useRef(`sa-${Date.now()}`).current;

  async function load() {
    setLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/admin/standalone-assignments", { credentials: "include" }),
        fetch("/api/admin/courses", { credentials: "include" }),
      ]);

      // Parse independently so one failure doesn't block the other
      if (aRes.ok) {
        const aData = await aRes.json();
        setAssignments(aData.assignments ?? []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCourses(cData.courses ?? []);
      } else {
        console.error("Failed to load courses:", await cRes.text());
      }
    } catch (e) {
      // Network-level failure — try courses alone as fallback
      try {
        const cRes = await fetch("/api/admin/courses", { credentials: "include" });
        if (cRes.ok) {
          const cData = await cRes.json();
          setCourses(cData.courses ?? []);
        } else {
          console.error("Fallback failed to load courses:", await cRes.text());
        }
      } catch (err) {
        console.error("Network error loading courses:", err);
      }
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newTitle.trim()) { setCreateError("Title is required."); return; }
    if (newScope === "course" && !newCourseId) { setCreateError("Please select a course."); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/standalone-assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          instructions: newAssignmentData.instructions,
          dueDate: newAssignmentData.dueDate || null,
          totalMarks: newAssignmentData.totalMarks || null,
          allowedSubmissionTypes: newAssignmentData.allowedSubmissionTypes,
          attachedFiles: newAssignmentData.attachedFiles || [],
          referenceLinks: newAssignmentData.referenceLinks || [],
          scope: newScope,
          courseId: newScope === "course" ? newCourseId : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
      setShowCreate(false);
      resetForm();
      await load();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment? All student submissions will also be removed.")) return;
    setDeleting(id);
    await fetch(`/api/admin/standalone-assignments/${id}`, { method: "DELETE", credentials: "include" });
    setDeleting(null);
    await load();
  }

  function resetForm() {
    setNewTitle("");
    setNewScope("course");
    setNewCourseId("");
    setNewAssignmentData({ title: "", instructions: "", allowedSubmissionTypes: ["text"], requiresApproval: false, attachedFiles: [], referenceLinks: [] });
    setCreateError("");
  }

  const filtered = assignments.filter(a => filter === "all" || a.scope === filter);

  return (
    <div className="w-full px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Standalone Tasks</h1>
          </div>
          <p className="text-sm text-secondary">Create and manage assignments that are independent of course curriculum.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); resetForm(); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="size-4" /> New Assignment
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-default mb-6">
        <button
          onClick={() => setActiveTab("assignments")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "assignments" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "submissions" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Task Reviews
        </button>
      </div>

      {activeTab === "submissions" ? (
        <StandaloneSubmissionsTab />
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "course", "common"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors border ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "bg-white text-secondary border-default hover:border-primary hover:text-primary"
            }`}
          >
            {f === "all" ? `All (${assignments.length})` : f === "common" ? `Common (${assignments.filter(a => a.scope === "common").length})` : `Course-Specific (${assignments.filter(a => a.scope === "course").length})`}
          </button>
        ))}
      </div>

          {/* Content */}
          {loading ? (
            <div className="flex min-h-[60vh] items-center justify-center"><RoboLoader size="md" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-default bg-white">
              <ClipboardList className="size-12 text-muted mb-3" />
              <p className="text-sm font-semibold text-foreground">No assignments yet</p>
              <p className="text-xs text-muted mt-1">Click "New Assignment" to create your first standalone task.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((a) => (
                <div key={a.id} className="group relative rounded-2xl border border-default bg-white p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                  {/* Scope badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      a.scope === "common"
                        ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      {a.scope === "common" ? <><Globe className="size-3" /> Common</> : <><BookOpen className="size-3" /> Course</>}
                    </span>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-500 p-1"
                    >
                      {deleting === a.id ? <RoboLoader size="xs" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>

                  <h3 className="font-bold text-foreground text-base leading-snug mb-1 line-clamp-2">{a.title}</h3>

                  {a.course_title && (
                    <p className="text-xs text-muted mb-3">{a.course_title}</p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-muted mb-4">
                    <span className="flex items-center gap-1"><Users className="size-3" /> {a.student_count} assigned</span>
                    {a.due_date && (
                      <span className="flex items-center gap-1"><Clock className="size-3" /> Due {fmtDate(a.due_date)}</span>
                    )}
                  </div>

                  <Link
                    href={`/admin/standalone-assignments/${a.id}`}
                    className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary/10 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    Manage <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 py-8 md:py-12 bg-black/50 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <h2 className="font-display text-lg font-bold">Create Standalone Task</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-2 text-muted hover:bg-subtle rounded-full transition-colors"><X className="size-5" /></button>
            </div>
            
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Task Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Mid-term Project" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Scope</label>
                  <div className="flex bg-subtle p-1 rounded-lg">
                    <button onClick={() => setNewScope("course")} className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${newScope === "course" ? "bg-white shadow-sm text-primary" : "text-secondary hover:text-foreground"}`}>Course-Specific</button>
                    <button onClick={() => setNewScope("common")} className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-colors ${newScope === "common" ? "bg-white shadow-sm text-primary" : "text-secondary hover:text-foreground"}`}>Common Task</button>
                  </div>
                </div>
              </div>

              {newScope === "course" && (
                <div className="mb-8">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Course</label>
                  <Combobox
                    options={courses.map((c) => ({ value: c.id, label: c.title }))}
                    value={newCourseId}
                    onValueChange={setNewCourseId}
                    placeholder="Select a course…"
                    searchPlaceholder="Search courses…"
                  />
                </div>
              )}

              <div className="border border-default rounded-xl overflow-hidden mb-6 p-2">
                <AssignmentModuleEditor
                  moduleId={moduleId}
                  assignmentData={newAssignmentData}
                  onChange={setNewAssignmentData}
                  hideTitle={true}
                />
              </div>

              {createError && (
                <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-semibold">
                  <AlertCircle className="size-4 shrink-0" />
                  <p>{createError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-default">
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-5 py-2.5 text-sm font-bold text-secondary hover:bg-subtle rounded-xl transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {creating ? <RoboLoader size="xs" className="text-current" /> : <Save className="size-4" />} Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
