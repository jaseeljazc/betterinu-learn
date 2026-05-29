"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  fetchStudentDetail,
  fetchCourses,
  fetchSubmissions,
  fetchStandaloneSubmissions,
  fetchStandaloneAssignments,
  updateStudent,
  deleteStudent,
  assignCourse,
  unassignCourse,
  assignTask,
  reviewSubmission,
} from "@/lib/services/student-service"

// ── Query keys ───────────────────────────────────────────────────────────────

const studentKeys = {
  detail: (id: string) => ["student", "detail", id] as const,
  courses: () => ["admin", "courses"] as const,
  submissions: (id: string) =>
    ["student", "submissions", id] as const,
  standaloneSubs: (id: string) =>
    ["student", "standalone-subs", id] as const,
  standaloneAssignments: () =>
    ["admin", "standalone-assignments"] as const,
}

// ── Data queries ─────────────────────────────────────────────────────────────

export function useStudentDetailData(studentId: string) {
  const detailQuery = useQuery({
    queryKey: studentKeys.detail(studentId),
    queryFn: () => fetchStudentDetail(studentId),
    enabled: !!studentId,
  })

  const coursesQuery = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchCourses,
  })

  const submissionsQuery = useQuery({
    queryKey: studentKeys.submissions(studentId),
    queryFn: () => fetchSubmissions(studentId),
    enabled: !!studentId,
  })

  const standaloneSubsQuery = useQuery({
    queryKey: studentKeys.standaloneSubs(studentId),
    queryFn: () => fetchStandaloneSubmissions(studentId),
    enabled: !!studentId,
  })

  const standaloneTasksQuery = useQuery({
    queryKey: studentKeys.standaloneAssignments(),
    queryFn: fetchStandaloneAssignments,
  })

  const isLoading =
    detailQuery.isLoading ||
    coursesQuery.isLoading ||
    submissionsQuery.isLoading

  const loadError =
    detailQuery.error?.message ||
    coursesQuery.error?.message ||
    null

  function refetchAll() {
    detailQuery.refetch()
    submissionsQuery.refetch()
    standaloneSubsQuery.refetch()
    standaloneTasksQuery.refetch()
  }

  return {
    student: detailQuery.data?.student ?? null,
    assigned: detailQuery.data?.courses ?? [],
    allCourses: coursesQuery.data?.courses ?? [],
    submissions: submissionsQuery.data?.submissions ?? [],
    standaloneSubs: standaloneSubsQuery.data?.submissions ?? [],
    allTasks: standaloneTasksQuery.data?.assignments ?? [],
    isLoading,
    loadError,
    refetchAll,
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: any) => updateStudent(studentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      })
      toast.success("Student updated successfully.")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update student")
    },
  })
}

export function useDeleteStudent(studentId: string) {
  const router = useRouter()

  return useMutation({
    mutationFn: () => deleteStudent(studentId),
    onSuccess: () => {
      toast.success("Student deleted.")
      router.push("/admin/students")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete student")
    },
  })
}

export function useAssignCourse(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (courseId: string) =>
      assignCourse(studentId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      })
      toast.success("Course assigned.")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to assign course")
    },
  })
}

export function useUnassignCourse(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (courseId: string) =>
      unassignCourse(studentId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      })
      toast.success("Course removed.")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove course")
    },
  })
}

export function useAssignTask(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      studentIds,
    }: {
      taskId: string
      studentIds: string[]
    }) => assignTask(taskId, studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      })
      queryClient.invalidateQueries({
        queryKey: studentKeys.standaloneSubs(studentId),
      })
      queryClient.invalidateQueries({
        queryKey: studentKeys.standaloneAssignments(),
      })
      toast.success("Task assigned.")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to assign task")
    },
  })
}

export function useReviewSubmission(studentId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      submissionId,
      action,
      feedback,
    }: {
      submissionId: string
      action: "approve" | "reject"
      feedback: string
    }) => reviewSubmission(submissionId, action, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: studentKeys.submissions(studentId),
      })
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(studentId),
      })
      toast.success("Review submitted.")
    },
    onError: (err: Error) => {
      toast.error(err.message || "Review action failed")
    },
  })
}
