"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Save, Globe, BookOpen, Users, Pencil, UserPlus, Eye, X, AlertCircle,
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { AssignmentModuleEditor } from "@/components/admin/AssignmentModuleEditor";
import { FileViewer } from "@/components/ui/FileViewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  submission_status: string | null;
}
interface StudentRow { id: string; name: string; email: string; }

const STATUS_CFG: Record<string, string> = {
  pending: "bg-amber-50 border-amber-200 text-amber-700",
  approved: "bg-green-50 border-green-200 text-green-700",
  rejected: "bg-red-50 border-red-200 text-red-600",
};
const STATUS_LABEL: Record<string, string> = { pending: "Under Review", approved: "Approved", rejected: "Revise" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StandaloneAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [editData, setEditData] = useState<AssignmentSubModuleData | null>(null);
  const [editTitle, setEditTitle] = useState("");

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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><RoboLoader size="md" /></div>;
  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="size-8 text-red-500" />
      <p className="font-semibold text-foreground">Assignment not found</p>
      <Link href="/admin/standalone-assignments" className="text-sm text-primary hover:underline">Back to list</Link>
    </div>
  );

  const inputCls = "w-full rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10";

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

        <div className="w-full xl:w-80 shrink-0 space-y-4">
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

          <div className="rounded-2xl border border-default bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Assigned Students ({students.length})</p>
            {students.length === 0 ? (
              <p className="text-xs text-muted italic">No students assigned yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.map((s) => (
                  <div key={s.student_id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-subtle border border-default group">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{s.student_name}</p>
                      {s.submission_status ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase mt-0.5 ${STATUS_CFG[s.submission_status] || ""}`}>
                          {STATUS_LABEL[s.submission_status] || s.submission_status}
                        </span>
                      ) : <span className="text-[9px] text-muted">Not submitted</span>}
                    </div>
                    <button onClick={() => handleUnassign(s.student_id)} disabled={unassigning === s.student_id} className="p-1 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      {unassigning === s.student_id ? <RoboLoader size="xs" /> : <X className="size-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
