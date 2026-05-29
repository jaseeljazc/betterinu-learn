"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useUnassignCourse } from "@/lib/hooks/useStudentDetail"

import type { AssignedCourse } from "./types"

type RemoveCourseModalProps = {
  open: boolean
  onClose: () => void
  assignedCourses: AssignedCourse[]
  studentId: string
}

export function RemoveCourseModal({
  open,
  onClose,
  assignedCourses,
  studentId,
}: RemoveCourseModalProps) {
  const unassignMutation = useUnassignCourse(studentId)

  if (!open) return null

  function handleRemove(courseId: string) {
    unassignMutation.mutate(courseId, {
      onSuccess: () => {
        if (assignedCourses.length <= 1) onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="w-full max-w-md rounded-md bg-white shadow-2xl border border-default overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h2 className="font-display text-lg font-bold text-foreground">
            Remove Course
          </h2>
          <Button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="p-6 space-y-4">
          {assignedCourses.length === 0 ? (
            <p className="text-sm text-muted">
              This student is not assigned to any courses.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Select a course to remove from this student:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignedCourses.map((c) => (
                  <div
                    key={c.course_id}
                    className="flex items-center justify-between p-3 rounded-md border border-default bg-subtle"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {c.title}
                    </span>
                    <Button
                      onClick={() => handleRemove(c.course_id)}
                      disabled={unassignMutation.isPending}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
