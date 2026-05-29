"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  ClipboardList,
  Clock,
  CheckCircle2,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import type { AssignedCourse, Submission } from "./types"
import {
  buildWeekProgress,
  fmtDate,
  fmtDateTime,
  SUBMISSION_STATUS_CFG,
} from "./types"

type StudentTabsProps = {
  assigned: AssignedCourse[]
  submissions: Submission[]
  standaloneSubs: any[]
  onReviewSubmission: (sub: Submission) => void
}

export function StudentTabs({
  assigned,
  submissions,
  standaloneSubs,
  onReviewSubmission,
}: StudentTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "courses" | "submissions" | "tasks"
  >("courses")
  const [collapsedCourses, setCollapsedCourses] = useState<
    Set<string>
  >(new Set())

  function toggleCollapse(courseId: string) {
    setCollapsedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  return (
    <div className="flex-1 min-w-0 space-y-6 w-full">
      <div className="flex gap-1 rounded-md border border-default bg-white p-1 w-fit">
        {(["courses", "submissions", "tasks"] as const).map(
          (tab) => (
            <Button
              key={tab}
              variant="ghost"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-primary text-white hover:bg-primary/90 hover:text-white"
                  : "text-muted hover:text-foreground hover:bg-transparent"
              }`}
            >
              {tab === "courses"
                ? `Courses (${assigned.length})`
                : tab === "submissions"
                  ? `Submissions (${submissions.length})`
                  : `Tasks (${standaloneSubs.length})`}
            </Button>
          )
        )}
      </div>

      {activeTab === "courses" && (
        <CoursesTabContent
          assigned={assigned}
          submissions={submissions}
          collapsedCourses={collapsedCourses}
          onToggleCollapse={toggleCollapse}
        />
      )}

      {activeTab === "submissions" && (
        <SubmissionsTabContent
          submissions={submissions}
          onReviewSubmission={onReviewSubmission}
        />
      )}

      {activeTab === "tasks" && (
        <TasksTabContent standaloneSubs={standaloneSubs} />
      )}
    </div>
  )
}

// ── Courses Tab ──────────────────────────────────────────────────────────────

function CoursesTabContent({
  assigned,
  submissions,
  collapsedCourses,
  onToggleCollapse,
}: {
  assigned: AssignedCourse[]
  submissions: Submission[]
  collapsedCourses: Set<string>
  onToggleCollapse: (courseId: string) => void
}) {
  if (assigned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
        <BookOpen size={36} className="text-muted" />
        <div>
          <p className="font-semibold text-foreground">
            No courses assigned
          </p>
          <p className="mt-0.5 text-sm text-muted">
            Use the panel on the right to assign a course.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assigned.map((c) => {
        const weekProgress = buildWeekProgress(
          c.curriculum || [],
          c.completedSubModuleIds || []
        )
        const total = weekProgress.reduce(
          (a, w) => a + w.total,
          0
        )
        const done = weekProgress.reduce(
          (a, w) => a + w.done,
          0
        )
        const pct = total
          ? Math.round((done / total) * 100)
          : 0
        const courseSubs = submissions.filter(
          (s) => s.course_id === c.course_id
        )
        const courseApproved = courseSubs.filter(
          (s) => s.status === "approved"
        ).length
        const currentWeek =
          weekProgress.find((w) => w.done < w.total) ??
          weekProgress[weekProgress.length - 1]
        const isCollapsed = collapsedCourses.has(c.course_id)

        return (
          <div
            key={c.course_id}
            className="rounded-md border border-default bg-white overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground">
                    {c.title}
                  </h3>
                  <span className="rounded-full border border-default px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {c.level}
                  </span>
                </div>
                <p className="mt-1 text-sm text-secondary">
                  {c.duration} · Enrolled{" "}
                  {fmtDate(c.assigned_at)}
                </p>
              </div>
              <Button
                onClick={() => onToggleCollapse(c.course_id)}
                className="shrink-0 rounded-md border border-default p-1.5 text-muted hover:border-primary hover:text-primary transition-colors"
              >
                {isCollapsed ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4" />
                )}
              </Button>
            </div>

            {!isCollapsed && (
              <>
                <div className="px-5 pb-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary font-medium">
                      Course Progress
                    </span>
                    <span className="font-bold text-primary">
                      {done}/{total} lessons ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-subtle">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {currentWeek && total > 0 && (
                  <div className="mx-5 mb-4 rounded-md bg-primary/5 border border-primary/15 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">
                      Currently on
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {currentWeek.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {currentWeek.days.map((day: any) => {
                        const dayDone = day.lessons.filter(
                          (l: any) => l.done
                        ).length
                        const dayTotal = day.lessons.length
                        const isDayComplete =
                          dayDone === dayTotal &&
                          dayTotal > 0
                        return (
                          <span
                            key={day.id}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              isDayComplete
                                ? "bg-green-50 border-green-200 text-green-700"
                                : dayDone > 0
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-subtle border-default text-muted"
                            }`}
                          >
                            {isDayComplete ? (
                              <CheckCircle2 size={9} />
                            ) : dayDone > 0 ? (
                              <Clock size={9} />
                            ) : null}
                            {day.label} · {dayDone}/{dayTotal}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {weekProgress.length > 0 && (
                  <div className="border-t border-default">
                    <Accordion
                      type="multiple"
                      defaultValue={
                        currentWeek ? [currentWeek.id] : []
                      }
                      className="divide-y divide-default"
                    >
                      {weekProgress.map((week) => (
                        <AccordionItem
                          key={week.id}
                          value={week.id}
                          className="border-b-0"
                        >
                          <AccordionTrigger className="px-5 py-4 hover:bg-subtle/55 transition-colors hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <p className="text-sm font-bold text-foreground">
                                {week.title}
                              </p>
                              <span
                                className={`text-xs font-bold ${
                                  week.done === week.total &&
                                  week.total > 0
                                    ? "text-green-600"
                                    : week.done > 0
                                      ? "text-amber-600"
                                      : "text-muted"
                                }`}
                              >
                                {week.done}/{week.total}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-5 pb-5 space-y-5 pt-1">
                              {week.days.map((day: any) => (
                                <div key={day.id}>
                                  <p className="text-xs font-bold text-muted mb-2.5 uppercase tracking-wider">
                                    {day.label}
                                  </p>
                                  <div className="flex flex-col gap-1.5 pl-1">
                                    {day.lessons.map(
                                      (lesson: any) => (
                                        <div
                                          key={lesson.id}
                                          className={`flex items-start gap-2.5 rounded-md p-2 transition-colors ${
                                            lesson.done
                                              ? "bg-green-50/50"
                                              : "hover:bg-subtle/50"
                                          }`}
                                        >
                                          <div className="mt-0.5 shrink-0">
                                            {lesson.done ? (
                                              <CheckCircle2
                                                size={14}
                                                className="text-green-600"
                                              />
                                            ) : (
                                              <div className="size-3.5 rounded-full border border-default bg-subtle" />
                                            )}
                                          </div>
                                          <span
                                            className={`text-sm ${lesson.done ? "text-green-950 font-medium" : "text-foreground"}`}
                                          >
                                            {lesson.title}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {courseSubs.length > 0 && (
                  <div className="flex gap-3 border-t border-default px-5 py-3">
                    {[
                      {
                        label: "Submitted",
                        value: courseSubs.length,
                        color: "text-foreground",
                      },
                      {
                        label: "Approved",
                        value: courseApproved,
                        color: "text-green-700",
                      },
                      {
                        label: "Pending",
                        value: courseSubs.filter(
                          (s) => s.status === "pending"
                        ).length,
                        color: "text-amber-600",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="rounded-md bg-subtle px-3 py-1.5 text-center"
                      >
                        <p
                          className={`text-sm font-bold ${color}`}
                        >
                          {value}
                        </p>
                        <p className="text-[10px] text-muted">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Submissions Tab ──────────────────────────────────────────────────────────

function SubmissionsTabContent({
  submissions,
  onReviewSubmission,
}: {
  submissions: Submission[]
  onReviewSubmission: (sub: Submission) => void
}) {
  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
        <ClipboardList size={36} className="text-muted" />
        <div>
          <p className="font-semibold text-foreground">
            No submissions yet
          </p>
          <p className="mt-0.5 text-sm text-muted">
            This student hasn&apos;t submitted any assignments.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => {
        const cfg =
          SUBMISSION_STATUS_CFG[sub.status] ||
          SUBMISSION_STATUS_CFG.pending
        return (
          <div
            key={sub.id}
            className="rounded-md border border-default bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">
                  {sub.assignment_title}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {sub.course_title}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}
                >
                  {cfg.label}
                </span>
                <Button
                  onClick={() => onReviewSubmission(sub)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <Eye className="size-3.5" /> Review
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-md bg-subtle border border-default px-4 py-3 text-sm text-secondary whitespace-pre-wrap leading-relaxed">
              {sub.submitted_text || (
                <span className="text-muted italic">
                  No text submitted.
                </span>
              )}
            </div>

            {sub.feedback && (
              <div className="mt-2 flex gap-2 rounded-md bg-green-50 border border-green-100 px-4 py-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Admin Feedback
                  </p>
                  <p className="mt-0.5 text-sm text-green-800">
                    {sub.feedback}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <Clock size={10} /> Submitted{" "}
                {fmtDateTime(sub.submitted_at)}
              </span>
              {sub.reviewed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={10} /> Reviewed{" "}
                  {fmtDateTime(sub.reviewed_at)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTabContent({
  standaloneSubs,
}: {
  standaloneSubs: any[]
}) {
  if (standaloneSubs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
        <ClipboardList size={36} className="text-muted" />
        <div>
          <p className="font-semibold text-foreground">
            No task submissions
          </p>
          <p className="mt-0.5 text-sm text-muted">
            This student has not submitted any standalone tasks
            yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-default overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface border-b border-default text-xs font-bold uppercase tracking-widest text-muted">
            <th className="px-4 py-3 text-left">Assignment</th>
            <th className="px-4 py-3 text-left">Submitted</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-default">
          {standaloneSubs.map((sub: any) => (
            <tr
              key={sub.id}
              className="hover:bg-subtle/50 transition-colors"
            >
              <td className="px-4 py-3">
                <p className="font-semibold text-foreground">
                  {sub.assignment_title}
                </p>
                {sub.course_title && (
                  <p className="text-[11px] text-muted">
                    {sub.course_title}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-secondary">
                {new Date(sub.submitted_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    SUBMISSION_STATUS_CFG[
                      sub.status as keyof typeof SUBMISSION_STATUS_CFG
                    ]?.cls ||
                    "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  {SUBMISSION_STATUS_CFG[
                    sub.status as keyof typeof SUBMISSION_STATUS_CFG
                  ]?.label || sub.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href="/admin/standalone-submissions"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <Eye className="size-3.5" /> Review
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
