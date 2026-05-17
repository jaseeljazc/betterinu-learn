"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Save, Globe, BookOpen, Users, Pencil, UserPlus,
  X, AlertCircle, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  FileText, Paperclip,
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { AssignmentModuleEditor } from "@/components/admin/AssignmentModuleEditor";
import { FileViewer } from "@/components/ui/FileViewer";
import { Combobox } from "@/components/ui/combobox";
import type { AssignmentSubModuleData } from "@/types";

interface Assignment {
  id: string; title: string; scope: "course" | "common";
  course_id: string | null; course_title: string | null;
  instructions: string; due_date: string | null; total_marks: number | null;
  allowed_submission_types: string[]; attached_files: any[]; reference_links: any[];
}
interface AssignedStudent {
  student_id: string; student_name: string; student_email: string;
  assigned_at: string;
  submission_id: string | null;
  submission_status: string | null;
  submitted_at: string | null;
  submitted_text: string | null;
  submitted_files: { url: string; name: string; type: string }[] | null;
  feedback: string | null;
  reviewed_at: string | null;
}
interface StudentRow { id: string; name: string; email: string; }

const STATUS_CFG: Record<string, { cls: string; label: string; Icon: React.ElementType }> = {
  pending:  { cls: "bg-amber-50 border-amber-200 text-amber-700",  label: "Under Review", Icon: Clock },
  approved: { cls: "bg-green-50 border-green-200 text-green-700",  label: "Approved",      Icon: CheckCircle2 },
  rejected: { cls: "bg-red-50 border-red-200 text-red-600",        label: "Needs Revision",Icon: XCircle },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Expandable student submission card ──────────────────────────────────────
function StudentCard({
  s, onUnassign, unassigning,
}: {
  s: AssignedStudent;
  onUnassign: (id: string) => void;
  unassigning: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = s.submission_status ? STATUS_CFG[s.submission_status] : null;
  const hasSubmission = !!s.submission_id;

  return (
    <div className="rounded-xl border border-default bg-white overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-3 p-3">
        <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-extrabold text-primary">
          {s.student_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{s.student_name}</p>
          <p className="text-[10px] text-muted truncate">{s.student_email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {cfg ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${cfg.cls}`}>
              <cfg.Icon className="size-2.5" />{cfg.label}
            </span>
          ) : (
            <span className="text-[9px] text-muted font-medium">Not submitted</span>
          )}
          {hasSubmission && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg text-muted hover:bg-subtle hover:text-primary transition-colors"
              title={expanded ? "Collapse" : "View submission"}
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}
          <button
            onClick={() => onUnassign(s.student_id)}
            disabled={unassigning === s.student_id}
            className="p-1 text-muted hover:text-red-500 transition-colors"
          >
            {unassigning === s.student_id ? <RoboLoader size="xs" /> : <X className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded submission detail */}
      {expanded && hasSubmission && (
        <div className="border-t border-default bg-surface px-4 py-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
              Submission · {s.submitted_at ? fmtDateTime(s.submitted_at) : "—"}
            </p>
            {s.reviewed_at && (
              <p className="text-[9px] text-muted">Reviewed {fmtDate(s.reviewed_at)}</p>
            )}
          </div>

          {/* Submitted text */}
          {s.submitted_text && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted flex items-center gap-1 mb-1.5">
                <FileText className="size-2.5" /> Answer
              </p>
              <div className="rounded-lg border border-default bg-white p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {s.submitted_text}
              </div>
            </div>
          )}

          {/* Submitted files */}
          {(s.submitted_files || []).length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted flex items-center gap-1 mb-1.5">
                <Paperclip className="size-2.5" /> Uploaded Files
              </p>
              <FileViewer files={s.submitted_files!} title="" />
            </div>
          )}

          {/* Feedback */}
          {s.feedback && (
            <div className={`rounded-lg border p-3 text-xs ${
              s.submission_status === "approved"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}>
              <p className="font-bold uppercase tracking-widest text-[9px] mb-1">Instructor Feedback</p>
              {s.feedback}
            </div>
          )}

          {!s.submitted_text && !(s.submitted_files || []).length && (
            <p className="text-xs text-muted italic">No submission content available.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function StandaloneAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents]     = useState<AssignedStudent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");
  const [assigning, setAssigning]   = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [editData, setEditData]     = useState<AssignmentSubModuleData | null>(null);
  const [editTitle, setEditTitle]   = useState("");
  const [studentFilter, setStudentFilter] = useState<"all" | "submitted" | "pending" | "approved" | "rejected" | "todo">("all");

  async function load() {
    setLoading(true);
    try {
      const [aRes, sRes, allRes] = await Promise.all([
        fetch(`/api/admin/standalone-assignments/${id}`, { credentials: "include" }),
        fetch(`/api/admin/standalone-assignments/${id}/students`, { credentials: "include" }),
        fetch("/api/admin/students", { credentials: "include" }),
      ]);
      const [aData, sData, allData] = await Promise.all([aRes.json(), sRes.json(), allRes.json()]);
      setAssignment(aData.assignment);
      setStudents(sData.students ?? []);
      setAllStudents(allData.students ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function startEdit() {
    if (!assignment) return;
    setEditTitle(assignment.title);
    setEditData({
      title: assignment.title,
      instructions: assignment.instructions,
      dueDate: assignment.due_date || "",
      totalMarks: assignment.total_marks || undefined,
      allowedSubmissionTypes: assignment.allowed_submission_types as any,
      requiresApproval: false,
      attachedFiles: assignment.attached_files || [],
      referenceLinks: assignment.reference_links || [],
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!editData || !assignment) return;
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/admin/standalone-assignments/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle, instructions: editData.instructions,
          dueDate: editData.dueDate || null, totalMarks: editData.totalMarks || null,
          allowedSubmissionTypes: editData.allowedSubmissionTypes,
          attachedFiles: editData.attachedFiles || [], referenceLinks: editData.referenceLinks || [],
          scope: assignment.scope, courseId: assignment.course_id,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditing(false); await load();
    } catch (e: any) { setSaveError(e.message); } finally { setSaving(false); }
  }

  async function handleAssign() {
    if (!selectedStudentId) return;
    setAssigning(true);
    await fetch(`/api/admin/standalone-assignments/${id}/assign`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: [selectedStudentId] }),
    });
    setSelectedStudentId(""); setAssigning(false); await load();
  }

  async function handleAssignAll() {
    if (!confirm("Assign this to all eligible students?")) return;
    setAssigning(true);
    await fetch(`/api/admin/standalone-assignments/${id}/assign`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignAll: true }),
    });
    setAssigning(false); await load();
  }

  async function handleUnassign(studentId: string) {
    if (!confirm("Remove this student?")) return;
    setUnassigning(studentId);
    await fetch(`/api/admin/standalone-assignments/${id}/assign`, {
      method: "DELETE", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setUnassigning(null); await load();
  }

  const assignedIds = new Set(students.map(s => s.student_id));
  const unassignedStudents = allStudents.filter(s => !assignedIds.has(s.id));

  const filteredStudents = students.filter(s => {
    if (studentFilter === "all") return true;
    if (studentFilter === "submitted") return !!s.submission_id;
    if (studentFilter === "todo") return !s.submission_id;
    return s.submission_status === studentFilter;
  });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RoboLoader size="md" /></div>;
  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="size-8 text-red-500" />
      <p className="font-semibold text-foreground">Assignment not found</p>
      <Link href="/admin/standalone-assignments" className="text-sm text-primary hover:underline">Back to list</Link>
    </div>
  );

  const inputCls = "w-full rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10";

  const submittedCount = students.filter(s => s.submission_id).length;
  const pendingCount   = students.filter(s => s.submission_status === "pending").length;
  const approvedCount  = students.filter(s => s.submission_status === "approved").length;
  const rejectedCount  = students.filter(s => s.submission_status === "rejected").length;
  const todoCount      = students.filter(s => !s.submission_id).length;

  return (
    <div className="w-full px-6 lg:px-10 py-8">
      <div className="mb-6">
        <Link href="/admin/standalone-assignments" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="size-4" /> All Standalone Tasks
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                assignment.scope === "common" ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-blue-50 border-blue-200 text-blue-700"
              }`}>
                {assignment.scope === "common" ? <><Globe className="size-3" /> Common</> : <><BookOpen className="size-3" /> Course</>}
              </span>
              {assignment.course_title && <span className="text-sm text-muted">{assignment.course_title}</span>}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{assignment.title}</h1>
          </div>
          {!editing && (
            <button onClick={startEdit} className="flex items-center gap-2 rounded-xl border border-default bg-white px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors shadow-sm">
              <Pencil className="size-4" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Left: Assignment content ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {editing ? (
            <div className="rounded-2xl border border-default bg-white p-6 space-y-5">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted mb-1">Title</label>
                <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              {editData && <AssignmentModuleEditor moduleId={id} assignmentData={editData} onChange={setEditData} hideTitle={true} />}
              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{saveError}</p>}
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                  {saving ? <RoboLoader size="xs" className="text-current" /> : <Save className="size-4" />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-default py-2.5 text-sm font-semibold text-secondary hover:bg-subtle">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-default bg-white p-6 space-y-4">
              <h2 className="text-sm font-bold text-foreground">Assignment Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Due Date", value: assignment.due_date ? fmtDate(assignment.due_date) : "No deadline" },
                  { label: "Total Marks", value: assignment.total_marks ? `${assignment.total_marks} marks` : "Ungraded" },
                  { label: "Submission Types", value: (assignment.allowed_submission_types || ["text"]).join(", ") },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{value}</p>
                  </div>
                ))}
              </div>
              {assignment.instructions && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Instructions</p>
                  <div className="rounded-xl border border-default bg-subtle p-4 text-sm text-secondary rich-content leading-relaxed" dangerouslySetInnerHTML={{ __html: assignment.instructions }} />
                </div>
              )}
              {(assignment.attached_files || []).length > 0 && <FileViewer files={assignment.attached_files} title="Reference Files" />}
            </div>
          )}
        </div>

        {/* ── Right: Students panel ── */}
        <div className="w-full xl:w-96 shrink-0 space-y-4">
          {/* Assign */}
          <div className="rounded-2xl border border-default bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Assign to Students</p>
            <div className="space-y-2">
              <Combobox
                options={unassignedStudents.map((s) => ({ value: s.id, label: s.name }))}
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
                placeholder="Select a student…"
                searchPlaceholder="Search students…"
              />
              <button onClick={handleAssign} disabled={!selectedStudentId || assigning} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                {assigning ? <RoboLoader size="xs" className="text-current" /> : <UserPlus className="size-4" />} Assign Student
              </button>
              <button onClick={handleAssignAll} disabled={assigning || unassignedStudents.length === 0} className="flex w-full items-center justify-center gap-2 rounded-xl border border-default px-4 py-2 text-sm font-semibold text-secondary hover:bg-subtle disabled:opacity-50">
                <Users className="size-4" /> Assign All Eligible
              </button>
            </div>
          </div>

          {/* Student list with submission details */}
          <div className="rounded-2xl border border-default bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Students ({students.length})</p>
              <div className="flex items-center gap-2 text-[9px] font-bold text-muted">
                <span className="text-amber-600">{pendingCount} review</span>
                <span className="text-green-700">{approvedCount} approved</span>
              </div>
            </div>

            {/* Filter pills */}
            {students.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {([
                  { key: "all",       label: `All (${students.length})` },
                  { key: "todo",      label: `To Do (${todoCount})` },
                  { key: "pending",   label: `Review (${pendingCount})` },
                  { key: "approved",  label: `Approved (${approvedCount})` },
                  { key: "rejected",  label: `Revise (${rejectedCount})` },
                ] as const).map(({ key, label }) => (
                  <button key={key} onClick={() => setStudentFilter(key)}
                    className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-colors border ${
                      studentFilter === key
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-secondary border-default hover:border-primary hover:text-primary"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {students.length === 0 ? (
              <p className="text-xs text-muted italic">No students assigned yet.</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-xs text-muted italic text-center py-4">No students in this filter.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5">
                {filteredStudents.map((s) => (
                  <StudentCard key={s.student_id} s={s} onUnassign={handleUnassign} unassigning={unassigning} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
