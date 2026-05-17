"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  BookOpen,
  CalendarClock,
  FileUp,
  RefreshCw,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FileViewer } from "@/components/ui/FileViewer";
import { FileUploader } from "@/components/ui/FileUploader";
import type { AttachedFile } from "@/components/ui/FileUploader";
import RoboLoader from "@/components/loading/robo-loader";

interface AssignmentDetail {
  assignment_id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  total_marks: number | null;
  allowed_submission_types: string[];
  attached_files: any[];
  reference_links: { label: string; url: string }[];
  scope: "course" | "common";
  course_title: string | null;
  submission_id: string | null;
  submitted_text: string | null;
  submitted_files: any[] | null;
  submitted_at: string | null;
  submission_status: "pending" | "approved" | "rejected" | null;
  feedback: string | null;
}

const STATUS_CFG = {
  pending: {
    Icon: Clock,
    label: "Under Review",
    cls: "bg-amber-50 border-amber-200 text-amber-700",
  },
  approved: {
    Icon: CheckCircle2,
    label: "Approved",
    cls: "bg-green-50 border-green-200 text-green-700",
  },
  rejected: {
    Icon: XCircle,
    label: "Needs Revision",
    cls: "bg-red-50 border-red-200 text-red-600",
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittedText, setSubmittedText] = useState("");
  const [submittedFiles, setSubmittedFiles] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/student/standalone-assignments", {
        credentials: "include",
      });
      const data = await res.json();
      const found = (data.assignments ?? []).find(
        (a: AssignmentDetail) => a.assignment_id === id,
      );
      setAssignment(found ?? null);
      // Pre-fill text if resubmitting (rejected state)
      if (found?.submission_status === "rejected" && found?.submitted_text) {
        setSubmittedText(found.submitted_text);
      } else {
        setSubmittedText("");
      }
      setSubmittedFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSubmit() {
    if (!assignment) return;
    const types = assignment.allowed_submission_types || ["text"];
    if (
      types.includes("text") &&
      !submittedText.trim() &&
      submittedFiles.length === 0
    ) {
      setSubmitError("Please enter your answer before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `/api/student/standalone-assignments/${id}/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submittedText,
            submittedFiles: submittedFiles.map((f) => ({
              url: f.url,
              name: f.name,
              type: f.type,
            })),
          }),
        },
      );
      if (!res.ok)
        throw new Error((await res.json()).error || "Submission failed");
      // Reload to immediately reflect pending status and show the submitted content
      await load();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <PageWrapper>
        <div className="flex h-64 items-center justify-center">
          <RoboLoader size="md" />
        </div>
      </PageWrapper>
    );

  if (!assignment)
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="size-8 text-red-500" />
          <p className="font-semibold text-foreground">Assignment not found</p>
          <Link
            href="/assignments"
            className="text-sm text-primary hover:underline"
          >
            Back to My Tasks
          </Link>
        </div>
      </PageWrapper>
    );

  const types = assignment.allowed_submission_types || ["text"];
  const statusCfg = assignment.submission_status
    ? STATUS_CFG[assignment.submission_status]
    : null;
  const hasSubmission = !!assignment.submission_id;
  const isApproved = assignment.submission_status === "approved";
  const isPending = assignment.submission_status === "pending";
  const isRejected = assignment.submission_status === "rejected";

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl pt-8 px-4 pb-16">
        {/* Back */}
        <Link
          href="/assignments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="size-4" /> My Tasks
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                assignment.scope === "common"
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {assignment.scope === "common" ? (
                <>
                  <Globe className="size-3" />
                  Common
                </>
              ) : (
                <>
                  <BookOpen className="size-3" />
                  {assignment.course_title}
                </>
              )}
            </span>
            {statusCfg && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCfg.cls}`}
              >
                <statusCfg.Icon size={11} />
                {statusCfg.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {assignment.title}
          </h1>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted">
            {assignment.due_date && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" /> Due{" "}
                {fmtDate(assignment.due_date)}
              </span>
            )}
            {assignment.total_marks && (
              <span>{assignment.total_marks} marks</span>
            )}
            {assignment.submitted_at && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> Submitted{" "}
                {fmtDate(assignment.submitted_at)}
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="rounded-2xl border border-default bg-white p-5 mb-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Instructions
            </p>
            <div
              className="text-sm text-secondary rich-content leading-relaxed"
              dangerouslySetInnerHTML={{ __html: assignment.instructions }}
            />
          </div>
        )}

        {/* Reference files */}
        {(assignment.attached_files || []).length > 0 && (
          <div className="mb-5">
            <FileViewer
              files={assignment.attached_files}
              title="Reference Materials"
            />
          </div>
        )}

        {/* Reference links */}
        {(assignment.reference_links || []).length > 0 && (
          <div className="rounded-2xl border border-default bg-white p-5 mb-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Reference Links
            </p>
            <div className="space-y-2">
              {assignment.reference_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Instructor Feedback ── */}
        {isRejected && assignment.feedback && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2">
              Instructor Feedback
            </p>
            <p className="text-sm text-red-800">{assignment.feedback}</p>
          </div>
        )}

        {/* ── Approved banner ── */}
        {isApproved && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 mb-5 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800 text-sm">
                Assignment Approved
              </p>
              {assignment.feedback && (
                <p className="text-xs text-green-700 mt-0.5">
                  {assignment.feedback}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Your Previous Submission (read-only view for pending/approved) ── */}
        {hasSubmission && (isPending || isApproved) && (
          <div className="rounded-2xl border border-default bg-white p-5 mb-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Your Submission
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusCfg?.cls}`}
              >
                {statusCfg && <statusCfg.Icon size={11} />}
                {statusCfg?.label}
              </span>
            </div>
            {assignment.submitted_text && (
              <div className="rounded-xl border border-default bg-surface p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {assignment.submitted_text}
              </div>
            )}
            {(assignment.submitted_files || []).length > 0 && (
              <FileViewer
                files={assignment.submitted_files!}
                title="Your Uploaded Files"
              />
            )}
          </div>
        )}

        {/* ── Submission / Resubmission Form ── */}
        {!isApproved && (
          <div className="rounded-2xl border border-default bg-white p-5 shadow-sm space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {isRejected
                ? "Resubmit Your Answer"
                : isPending
                  ? "Edit & Resubmit"
                  : "Your Answer"}
            </p>

            {/* Show previous submission inline for rejected (editable) */}
            {isRejected && hasSubmission && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
                Your previous submission was returned for revision. Update your
                answer below and resubmit.
              </div>
            )}

            {types.includes("text") && !isPending && (
              <textarea
                value={submittedText}
                onChange={(e) => setSubmittedText(e.target.value)}
                placeholder="Type your answer here..."
                rows={6}
                className="w-full resize-y rounded-xl border border-default bg-surface p-4 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            )}

            {(types.includes("file") || types.includes("image")) &&
              !isPending && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1.5">
                    <FileUp className="size-3.5" /> Upload Files
                  </p>
                  <FileUploader
                    folder={`standalone-submissions/${id}`}
                    files={submittedFiles}
                    onChange={setSubmittedFiles}
                    role="student"
                  />
                </div>
              )}

            {/* Show previously submitted files for rejected state */}
            {isRejected && (assignment.submitted_files || []).length > 0 && (
              <FileViewer
                files={assignment.submitted_files!}
                title="Previously Submitted Files"
              />
            )}

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {submitError}
              </p>
            )}

            {!isPending && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submitting ? (
                  <RoboLoader size="xs" className="text-current" />
                ) : isRejected ? (
                  <RefreshCw className="size-4" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitting
                  ? "Submitting…"
                  : isRejected
                    ? "Resubmit"
                    : "Submit Assignment"}
              </button>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
