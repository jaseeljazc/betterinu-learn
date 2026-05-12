"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
  XCircle,
} from "lucide-react";
import type { CourseId, SubModule } from "@/types";
import { Button } from "@/components/ui/button";
import RoboLoader from "@/components/loading/robo-loader";
import { FileUploader } from "@/components/ui/FileUploader";
import { FileViewer } from "@/components/ui/FileViewer";
import type { AttachedFile } from "@/components/ui/FileUploader";

interface Submission {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_text: string;
  submitted_at: string;
  feedback?: string;
  submitted_files?: AttachedFile[];
}

interface AssignmentViewerProps {
  module: SubModule;
  courseId: CourseId;
  weekId: string;
  dayId: string;
  onApprovedComplete?: () => void;
}

const STATUS_CONFIG = {
  pending: {
    Icon: Clock,
    label: "Pending Review",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  approved: {
    Icon: CheckCircle2,
    label: "Approved",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  rejected: {
    Icon: XCircle,
    label: "Rejected — please revise and resubmit",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
};

export function AssignmentViewer({
  module,
  courseId,
  weekId,
  dayId,
}: AssignmentViewerProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/student/assignments?assignmentId=${encodeURIComponent(module.id)}&courseId=${encodeURIComponent(courseId)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then(({ submission }) => {
        setSubmission(submission ?? null);
        if (submission) {
          setText(submission.submitted_text);
          setFiles(submission.submitted_files ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [module.id, courseId]);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/student/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: module.id,
          courseId,
          weekId,
          dayId,
          submittedText: text,
          submittedFiles: files,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmission(data.submission);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const status = submission ? STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG] : null;
  const canEdit = !submission || submission.status === "rejected";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RoboLoader size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Assignment Instructions */}
      <div className="rounded-2xl border border-default bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck className="size-5 text-primary" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Assignment</p>
            <h2 className="font-display text-lg font-bold text-foreground">{module.title}</h2>
          </div>
        </div>
        {module.description && (
          <div className="prose prose-sm max-w-none text-secondary leading-relaxed whitespace-pre-wrap">
            {module.description}
          </div>
        )}
        {module.content && (
          <div
            className="mt-4 prose prose-sm max-w-none text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: module.content }}
          />
        )}
        {/* Reference files attached by admin */}
        {module.attachedFiles?.length ? (
          <div className="mt-5 pt-5 border-t border-default">
            <FileViewer files={module.attachedFiles} title="Reference Materials" />
          </div>
        ) : null}
      </div>

      {/* Submission Status Banner */}
      {submission && status && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${status.bg}`}>
          <status.Icon className={`size-5 shrink-0 mt-0.5 ${status.color}`} />
          <div>
            <p className={`font-bold text-sm ${status.color}`}>{status.label}</p>
            <p className="text-xs text-muted mt-0.5">
              Submitted {new Date(submission.submitted_at).toLocaleString()}
            </p>
            {submission.feedback && (
              <p className="mt-2 text-sm text-foreground bg-white/60 rounded-lg px-3 py-2 border border-default">
                <strong>Feedback:</strong> {submission.feedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Submission Form */}
      {submission?.status === "approved" ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-10 text-center">
          <CheckCircle2 className="size-12 text-green-600 mb-3" />
          <p className="font-display text-xl font-bold text-green-700">Assignment Approved!</p>
          <p className="text-sm text-green-600 mt-1">Your work has been reviewed and approved.</p>
          {/* Show submitted files even after approval */}
          {submission.submitted_files?.length ? (
            <div className="mt-6 text-left w-full max-w-md">
              <FileViewer files={submission.submitted_files} title="Your Submitted Files" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-default bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">
              {canEdit ? "Your Answer" : "Your Submitted Answer"}
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canEdit || submitting}
              placeholder="Write your answer here..."
              rows={10}
              className="w-full resize-y rounded-xl border border-default bg-surface p-4 text-sm text-foreground leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>

          {/* File upload for student */}
          <div>
            <p className="text-sm font-bold text-foreground mb-2">
              {canEdit ? "Attach Files (optional)" : "Attached Files"}
            </p>
            {canEdit ? (
              <FileUploader
                folder={`submissions/${module.id}`}
                files={files}
                onChange={setFiles}
                role="student"
              />
            ) : (
              <FileViewer files={files} title="Your Submitted Files" />
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && !error && (
            <p className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✓ Submitted successfully! Your assignment is now pending review.
            </p>
          )}

          {canEdit && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              className="gap-2 font-bold"
            >
              {submitting ? (
                <RoboLoader size="xs" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting
                ? "Submitting…"
                : submission?.status === "rejected"
                ? "Resubmit Answer"
                : "Submit Assignment"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
