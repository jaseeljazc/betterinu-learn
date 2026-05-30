"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, AlertCircle } from "lucide-react"

import RoboLoader from "@/components/loading/robo-loader"
import { Button } from "@/components/ui/button"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"

import {
  useStudentDetailData,
  useUpdateStudent,
  useDeleteStudent,
} from "@/lib/hooks/useStudentDetail"

import type { Submission } from "@/components/admin/students/student-detail/types"
import { StudentHeader } from "@/components/admin/students/student-detail/student-header"
import { StudentInfoGrid } from "@/components/admin/students/student-detail/student-info-grid"
import { StudentTabs } from "@/components/admin/students/student-detail/student-tabs"
import { StudentSidebar } from "@/components/admin/students/student-detail/student-sidebar"

import { ReviewSubmissionModal } from "@/components/admin/students/student-detail/review-submission-modal"
import { RemoveCourseModal } from "@/components/admin/students/student-detail/remove-course-modal"

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { can } = useAdminPermissions()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const canEditStudent = mounted ? can("students", "edit") : false
  const canDeleteStudent = mounted
    ? can("students", "delete")
    : false

  // ── TanStack Query data ──────────────────────────────────────────────────
  const {
    student,
    assigned,
    allCourses,
    submissions,
    standaloneSubs,
    allTasks,
    isLoading,
    loadError,
    refetchAll,
  } = useStudentDetailData(id)

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateMutation = useUpdateStudent(id)
  const deleteMutation = useDeleteStudent(id)

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isRemoveCourseOpen, setIsRemoveCourseOpen] =
    useState(false)
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null)

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalLessons = assigned.reduce((acc, c) => {
    const total = (c.curriculum || [])
      .flatMap((w: any) =>
        (w.days || []).flatMap((d: any) => d.subModules || [])
      ).length
    return acc + total
  }, 0)
  const completedLessons = assigned.reduce(
    (acc, c) => acc + c.completedSubModules,
    0
  )
  const overallPct = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0
  const approvedCount = submissions.filter(
    (s) => s.status === "approved"
  ).length
  const pendingCount = submissions.filter(
    (s) => s.status === "pending"
  ).length
  const rejectedCount = submissions.filter(
    (s) => s.status === "rejected"
  ).length

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleDeleteClick() {
    if (
      !confirm(
        `Delete ${student?.name}? This cannot be undone.`
      )
    )
      return
    deleteMutation.mutate()
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center px-6">
        <AlertCircle className="size-8 text-red-500" />
        <p className="font-semibold text-foreground">
          Failed to load student
        </p>
        <p className="text-sm text-muted max-w-md">
          {loadError}
        </p>
        <Button
          onClick={() => refetchAll()}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Retry
        </Button>
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading || !student) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RoboLoader size="md" />
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-subtle px-4 sm:px-6 lg:px-10 py-10">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-6 transition-colors font-medium"
      >
        <ChevronLeft className="size-4" /> Back to Students
      </Link>

      {/* Hero Header */}
      <StudentHeader
        student={student}
        canEditStudent={canEditStudent}
        canDeleteStudent={canDeleteStudent}
        onEditClick={() => router.push(`/admin/students/${id}/edit`)}
        onRemoveCourseClick={() => setIsRemoveCourseOpen(true)}
        onDeleteClick={handleDeleteClick}
        deleting={deleteMutation.isPending}
      />

      <StudentInfoGrid
        student={student}
        canEditStudent={canEditStudent}
        updating={updateMutation.isPending}
      />

      {/* Tabs + Sidebar */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <StudentTabs
          studentId={id}
          canEditStudent={canEditStudent}
          assigned={assigned}
          submissions={submissions}
          standaloneSubs={standaloneSubs}
          onReviewSubmission={(sub) =>
            setSelectedSubmission(sub)
          }
        />

        <StudentSidebar
          studentId={id}
          canEditStudent={canEditStudent}
          assigned={assigned}
          allCourses={allCourses}
          allTasks={allTasks}
          standaloneSubs={standaloneSubs}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          rejectedCount={rejectedCount}
          overallPct={overallPct}
        />
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {selectedSubmission && (
        <ReviewSubmissionModal
          open={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          submission={selectedSubmission}
          studentId={id}
        />
      )}

      {isRemoveCourseOpen && (
        <RemoveCourseModal
          open={isRemoveCourseOpen}
          onClose={() => setIsRemoveCourseOpen(false)}
          assignedCourses={assigned}
          studentId={id}
        />
      )}
    </div>
  )
}
