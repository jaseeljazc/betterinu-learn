"use client"

import { useState } from "react"
import {
  X,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { FileViewer } from "@/components/ui/FileViewer"
import RoboLoader from "@/components/loading/robo-loader"

import { useReviewSubmission } from "@/lib/hooks/useStudentDetail"

import type { Submission } from "./types"

type ReviewSubmissionModalProps = {
  open: boolean
  onClose: () => void
  submission: Submission
  studentId: string
}

export function ReviewSubmissionModal({
  open,
  onClose,
  submission,
  studentId,
}: ReviewSubmissionModalProps) {
  const [feedback, setFeedback] = useState(
    submission.feedback ?? ""
  )
  const [actionError, setActionError] = useState("")

  const reviewMutation = useReviewSubmission(studentId)

  function handleAction(action: "approve" | "reject") {
    if (action === "reject" && !feedback.trim()) {
      setActionError(
        "Please provide feedback before rejecting."
      )
      return
    }
    setActionError("")
    reviewMutation.mutate(
      {
        submissionId: submission.id,
        action,
        feedback,
      },
      {
        onSuccess: () => {
          setFeedback("")
          onClose()
        },
      }
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md bg-white shadow-2xl border border-default">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
              Assignment Review
            </p>
            <h2 className="font-display text-lg font-bold text-foreground">
              {submission.assignment_title ||
                "Unknown Assignment"}
            </h2>
          </div>
          <Button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {submission.assignment_data && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Assignment Details
              </h3>
              {submission.assignment_data.description && (
                <div className="rounded-md border border-default bg-subtle p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {submission.assignment_data.description}
                </div>
              )}
              {submission.assignment_data.files &&
                submission.assignment_data.files.length > 0 && (
                  <FileViewer
                    files={submission.assignment_data.files}
                    title="Reference Materials (Admin)"
                  />
                )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              Submitted Content
            </h3>
            <div className="rounded-md border border-default bg-[#fbfbf9] p-4 text-sm text-secondary whitespace-pre-wrap leading-relaxed shadow-inner">
              {submission.submitted_text || (
                <span className="italic text-muted">
                  No text provided.
                </span>
              )}
            </div>
            {submission.submitted_files &&
              submission.submitted_files.length > 0 && (
                <div className="mt-3">
                  <FileViewer
                    files={submission.submitted_files}
                    title="Student's Uploaded Files"
                  />
                </div>
              )}
          </div>

          <div className="rounded-md border border-default bg-surface p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Admin Action
            </h3>

            {submission.status === "approved" ? (
              <div className="rounded-md bg-green-50 border border-green-200 p-4 flex items-start gap-3">
                <CheckCircle2 className="size-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-bold text-green-800">
                    Assignment Approved
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {submission.feedback ||
                      "No feedback provided."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Feedback (required for rejection)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Great job on..."
                    rows={3}
                    className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {actionError && (
                  <p className="text-sm font-medium text-red-500 bg-red-50 p-2 rounded-md border border-red-100">
                    {actionError}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAction("approve")}
                    disabled={reviewMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                  >
                    {reviewMutation.isPending ? (
                      <RoboLoader
                        size="xs"
                        className="text-current"
                      />
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleAction("reject")}
                    disabled={reviewMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {reviewMutation.isPending ? (
                      <RoboLoader
                        size="xs"
                        className="text-current"
                      />
                    ) : (
                      <>
                        <XCircle className="size-4" />
                        Request Revision
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
