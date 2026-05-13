"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Send,
  XCircle,
  Link2,
  FileUp,
  ImageIcon,
  AlignLeft,
  CalendarClock,
  Trophy,
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

const SUBMISSION_TYPE_ICONS: Record<string, any> = {
  text: AlignLeft,
  file: FileUp,
  image: ImageIcon,
  url: Link2,
};

export function AssignmentViewer({
  module,
  courseId,
  weekId,
  dayId,
}: AssignmentViewerProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Get the rich assignmentData if available (new format), otherwise fallback
  const assignmentData = module.assignmentData;
  const title = assignmentData?.title || module.title;
  const instructions = assignmentData?.instructions || module.description || "";
  const dueDate = assignmentData?.dueDate;
  const totalMarks = assignmentData?.totalMarks;
  const allowedTypes = assignmentData?.allowedSubmissionTypes || ["text"];

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
          if (submission.status === "approved" && onApprovedComplete) {
            onApprovedComplete();
          }
          setText(submission.submitted_text || "");
          setFiles(submission.submitted_files ?? []);
          // try to extract url from submitted_text if it looks like a URL
          if (
            allowedTypes.includes("url") &&
            submission.submitted_text?.startsWith("http")
          ) {
            setUrl(submission.submitted_text);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [module.id, courseId]);

  async function handleSubmit() {
    // Build the submitted text: url takes precedence if that's what they filled
    const finalText =
      allowedTypes.includes("url") && url.trim() ? url.trim() : text.trim();
    if (!finalText && files.length === 0) {
      setError("Please provide a response before submitting.");
      return;
    }
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
          submittedText: finalText || "(see attached files)",
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

  const status = submission
    ? STATUS_CONFIG[submission.status as keyof typeof STATUS_CONFIG]
    : null;
  const canEdit = !submission || submission.status === "rejected";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RoboLoader size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Assignment Header Card */}
      <div className="rounded-2xl border border-default bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100">
            <ClipboardCheck className="size-5 text-orange-600" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
              Assignment
            </p>
            <h2 className="font-display text-lg font-bold text-foreground">
              {title}
            </h2>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 mb-4">
          {dueDate && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-semibold">
              <CalendarClock className="size-3.5" />
              Due: {new Date(dueDate).toLocaleString()}
            </div>
          )}
          {totalMarks !== undefined && (
            <div className="flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs text-purple-700 font-semibold">
              <Trophy className="size-3.5" />
              {totalMarks} marks
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {allowedTypes.map((t) => {
              const Icon = SUBMISSION_TYPE_ICONS[t] || AlignLeft;
              return (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-surface border border-default px-2.5 py-1 text-[10px] font-bold text-muted uppercase tracking-wider"
                >
                  <Icon className="size-3" />
                  {t}
                </span>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div
            className="prose prose-sm max-w-none text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: instructions }}
          />
        )}

        {/* Reference files — from assignmentData (new) or legacy module.attachedFiles */}
        {(() => {
          const files = assignmentData?.attachedFiles?.length
            ? assignmentData.attachedFiles
            : module.attachedFiles;
          return files?.length ? (
            <div className="mt-5 pt-5 border-t border-default">
              <FileViewer files={files} title="Reference Materials" />
            </div>
          ) : null;
        })()}

        {/* Reference links */}
        {(assignmentData?.referenceLinks || []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-default space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Reference Links</p>
            <div className="flex flex-wrap gap-2">
              {(assignmentData!.referenceLinks!).map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-default bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary hover:shadow-sm transition-all"
                >
                  <Link2 className="size-3 shrink-0" />
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Banner */}
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
                <strong>Instructor Feedback:</strong> {submission.feedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Approved state */}
      {submission?.status === "approved" ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-10 text-center">
          <CheckCircle2 className="size-12 text-green-600 mb-3" />
          <p className="font-display text-xl font-bold text-primary">
            Assignment Approved!
          </p>
          <p className="text-sm text-green-600 mt-1">
            Your work has been reviewed and approved. Next content is unlocked.
          </p>
          {submission.submitted_files?.length ? (
            <div className="mt-6 text-left w-full max-w-md">
              <FileViewer files={submission.submitted_files} title="Your Submitted Files" />
            </div>
          ) : null}
        </div>
      ) : (
        /* Submission form */
        <div className="rounded-2xl border border-default bg-white p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-foreground">
            {canEdit
              ? submission?.status === "rejected"
                ? "Resubmit Your Work"
                : "Submit Your Work"
              : "Your Submission"}
          </h3>

          {/* Text response */}
          {allowedTypes.includes("text") && (
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-widest">
                Text Response
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!canEdit || submitting}
                placeholder="Write your answer here..."
                rows={8}
                className="w-full resize-y rounded-xl border border-default bg-surface p-4 text-sm text-foreground leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
              />
            </div>
          )}

          {/* URL submission */}
          {allowedTypes.includes("url") && (
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-widest">
                URL / Link
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={!canEdit || submitting}
                placeholder="https://github.com/your-repo"
                className="w-full rounded-xl border border-default bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
              />
            </div>
          )}

          {/* File / image upload */}
          {(allowedTypes.includes("file") || allowedTypes.includes("image")) && (
            <div>
              <label className="block text-xs font-bold text-muted mb-1 uppercase tracking-widest">
                {allowedTypes.includes("image") && !allowedTypes.includes("file")
                  ? "Image Upload"
                  : "File Upload"}
              </label>
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
          )}

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
              disabled={submitting}
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
                ? "Resubmit"
                : "Submit Assignment"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
