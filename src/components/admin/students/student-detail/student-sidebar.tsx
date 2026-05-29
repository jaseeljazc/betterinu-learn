"use client"

import { useState } from "react"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import RoboLoader from "@/components/loading/robo-loader"

import {
  useAssignCourse,
  useAssignTask,
} from "@/lib/hooks/useStudentDetail"

import type { AssignedCourse, CourseRow } from "./types"

type StudentSidebarProps = {
  studentId: string
  canEditStudent: boolean
  assigned: AssignedCourse[]
  allCourses: CourseRow[]
  allTasks: any[]
  standaloneSubs: any[]
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  overallPct: number
}

export function StudentSidebar({
  studentId,
  canEditStudent,
  assigned,
  allCourses,
  allTasks,
  standaloneSubs,
  approvedCount,
  pendingCount,
  rejectedCount,
  overallPct,
}: StudentSidebarProps) {
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedTask, setSelectedTask] = useState("")

  const assignCourseMutation = useAssignCourse(studentId)
  const assignTaskMutation = useAssignTask(studentId)

  const unassigned = allCourses.filter(
    (c) => !assigned.some((a) => a.course_id === c.id)
  )

  const assignedCourseIds = new Set(
    assigned.map((a) => a.course_id)
  )
  const eligibleTasks = allTasks.filter(
    (t) =>
      t.scope === "common" ||
      (t.scope === "course" &&
        assignedCourseIds.has(t.course_id))
  )
  const submittedTaskIds = new Set(
    standaloneSubs.map((s) => s.assignment_id)
  )
  const unassignedTasks = eligibleTasks.filter(
    (t) => !submittedTaskIds.has(t.id)
  )

  function handleAssign() {
    if (!selectedCourse) return
    assignCourseMutation.mutate(selectedCourse, {
      onSuccess: () => setSelectedCourse(""),
    })
  }

  function handleAssignTask() {
    if (!selectedTask) return
    assignTaskMutation.mutate(
      { taskId: selectedTask, studentIds: [studentId] },
      { onSuccess: () => setSelectedTask("") }
    )
  }

  return (
    <div className="w-full xl:w-72 shrink-0 xl:sticky xl:top-6 space-y-4">
      {canEditStudent && (
        <>
          {/* Assign Course card */}
          <div className="rounded-md border border-default bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Assign Course
            </p>
            {unassigned.length === 0 ? (
              <p className="text-sm text-muted italic">
                All available courses are already assigned.
              </p>
            ) : (
              <div className="space-y-3">
                <Combobox
                  options={unassigned.map((c) => ({
                    value: c.id,
                    label: c.title,
                  }))}
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                  placeholder="Select a course…"
                  searchPlaceholder="Search courses…"
                />
                <Button
                  onClick={handleAssign}
                  disabled={
                    !selectedCourse ||
                    assignCourseMutation.isPending
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {assignCourseMutation.isPending ? (
                    <RoboLoader
                      size="xs"
                      className="text-current"
                    />
                  ) : (
                    <PlusCircle className="size-4" />
                  )}
                  {assignCourseMutation.isPending
                    ? "Assigning…"
                    : "Assign Course"}
                </Button>
              </div>
            )}
          </div>

          {/* Assign Task card */}
          <div className="rounded-md border border-default bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
              Assign Task
            </p>
            {unassignedTasks.length === 0 ? (
              <p className="text-sm text-muted italic">
                No eligible tasks to assign.
              </p>
            ) : (
              <div className="space-y-3">
                <Combobox
                  options={unassignedTasks.map((t) => ({
                    value: t.id,
                    label: `${t.title} ${t.scope === "common" ? "(Common)" : `(${t.course_title})`}`,
                  }))}
                  value={selectedTask}
                  onValueChange={setSelectedTask}
                  placeholder="Select a task…"
                  searchPlaceholder="Search tasks…"
                />
                <Button
                  onClick={handleAssignTask}
                  disabled={
                    !selectedTask ||
                    assignTaskMutation.isPending
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {assignTaskMutation.isPending ? (
                    <RoboLoader
                      size="xs"
                      className="text-current"
                    />
                  ) : (
                    <PlusCircle className="size-4" />
                  )}
                  {assignTaskMutation.isPending
                    ? "Assigning…"
                    : "Assign Task"}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick stats card */}
      <div className="rounded-md border border-default bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
          Quick Stats
        </p>
        <div className="space-y-2">
          {[
            {
              label: "Courses Assigned",
              value: assigned.length,
              color: "text-primary",
            },
            {
              label: "Assignments Approved",
              value: approvedCount,
              color: "text-green-700",
            },
            {
              label: "Pending Review",
              value: pendingCount,
              color: "text-amber-600",
            },
            {
              label: "Needs Revision",
              value: rejectedCount,
              color: "text-red-600",
            },
            {
              label: "Overall Progress",
              value: `${overallPct}%`,
              color: "text-foreground",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 border-b border-default last:border-0"
            >
              <span className="text-xs text-muted">{label}</span>
              <span className={`text-sm font-bold ${color}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
