"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  X,
  XCircle,
  ClipboardList,
  Send,
  BookOpen,
} from "lucide-react";
import RoboLoader from "@/components/loading/robo-loader";
import { FileViewer } from "@/components/ui/FileViewer";

interface Submission {
  id: string;
  assignment_id: string;
  student_name: string;
  student_email: string;
  student_id: string;
  course_id: string;
  course_title: string;
  assignment_title?: string;
  assignment_data?: any;
  week_id: string;
  day_id: string;
  submitted_text: string;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  feedback?: string;
  reviewed_at?: string;
  submitted_files?: { url: string; name: string; type: string }[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-green-100 text-primary border-green-200" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/assignments", { credentials: "include" });
    const data = await res.json();
    setSubmissions(data.submissions ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAction(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "reject" && !feedback.trim()) {
      setActionError("Please provide feedback before rejecting.");
      return;
    }
    setActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/assignments/${selected.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback }),
      });
      if (!res.ok) throw new Error("Action failed");
      setSelected(null);
      setFeedback("");
      await load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActing(false);
    }
  }

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);

  return (
    <div className="w-full px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Task Submissions
          </h1>
        </div>
        <p className="text-sm text-secondary">
          Review and approve or reject student assignment submissions.
        </p> 
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors border ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "bg-white text-secondary border-default hover:border-primary hover:text-primary"
            }`}
          >
            {f === "all"
              ? `All (${submissions.length})`
              : `${f.charAt(0).toUpperCase() + f.slice(1)} (${submissions.filter((s) => s.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <RoboLoader size="md" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-default">
          <ClipboardList className="size-12 text-muted mb-3" />
          <p className="text-sm font-semibold text-foreground">No submissions yet</p>
          <p className="text-xs text-muted mt-1">Student assignment submissions will appear here.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-default overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-default text-xs font-bold uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Course</th>
                <th className="px-4 py-3 text-left">Assignment</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {filtered.map((sub) => {
                const badge = STATUS_BADGE[sub.status] ?? STATUS_BADGE.pending;
                return (
                  <tr key={sub.id} className="hover:bg-subtle/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{sub.student_name}</p>
                      <p className="text-[11px] text-muted">{sub.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-secondary">{sub.course_title}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground text-sm">
                        {sub.assignment_title || "Unknown Assignment"}
                      </p>
                      <p className="text-[10px] text-muted font-mono mt-0.5 truncate max-w-[150px]" title={sub.assignment_id}>
                        {sub.assignment_id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                        {sub.status === "pending" && <Clock className="size-3" />}
                        {sub.status === "approved" && <CheckCircle2 className="size-3" />}
                        {sub.status === "rejected" && <XCircle className="size-3" />}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelected(sub); setFeedback(sub.feedback ?? ""); setActionError(""); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <Eye className="size-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-default">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Assignment Review</p>
                <h2 className="font-display text-lg font-bold text-foreground">{selected.student_name}</h2>
                <p className="text-xs text-muted">{selected.course_title}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Current Status */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[selected.status]?.cls}`}>
                  {selected.status}
                </span>
                <span className="text-xs text-muted">
                  Submitted {new Date(selected.submitted_at).toLocaleString()}
                </span>
              </div>

              {/* Assignment Prompt/Details */}
              {selected.assignment_data && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    Assignment Details
                  </h3>
                  {selected.assignment_data.description && (
                    <div className="rounded-xl border border-default bg-subtle p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selected.assignment_data.description}
                    </div>
                  )}
                  {selected.assignment_data.files?.length > 0 && (
                    <FileViewer
                      files={selected.assignment_data.files}
                      title="Reference Materials (Admin)"
                    />
                  )}
                </div>
              )}

              {/* Student's Answer */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Student's Answer</p>
                <div className="rounded-xl border border-default bg-surface p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selected.submitted_text || <span className="italic text-muted">No text provided.</span>}
                </div>
              </div>


              {/* Student's Uploaded Files */}
              {selected.submitted_files?.length ? (
                <FileViewer
                  files={selected.submitted_files}
                  title="Student's Uploaded Files"
                />
              ) : null}

              {/* Feedback Field */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted mb-2 block">
                  Feedback / Reason (required for rejection)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write feedback for the student..."
                  rows={4}
                  className="w-full resize-y rounded-xl border border-default bg-surface p-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {actionError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {actionError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-default">
                <button
                  onClick={() => handleAction("approve")}
                  disabled={acting || selected.status === "approved"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {acting ? <RoboLoader size="xs" /> : <CheckCircle2 className="size-4" />}
                  Approve & Unlock Next Day
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={acting || selected.status === "approved"}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {acting ? <RoboLoader size="xs" /> : <XCircle className="size-4" />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
