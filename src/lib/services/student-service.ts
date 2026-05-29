import { apiClient } from "../api-client"

// ── Queries ──────────────────────────────────────────────────────────────────

export async function fetchStudentDetail(id: string) {
  return apiClient<{ student: any; courses: any[] }>(
    `/api/admin/students/${id}`
  )
}

export async function fetchCourses() {
  return apiClient<{ courses: any[] }>("/api/admin/courses")
}

export async function fetchSubmissions(studentId: string) {
  return apiClient<{ submissions: any[] }>(
    `/api/admin/assignments?studentId=${studentId}`
  )
}

export async function fetchStandaloneSubmissions(studentId: string) {
  return apiClient<{ submissions: any[] }>(
    `/api/admin/standalone-submissions?studentId=${studentId}`
  )
}

export async function fetchStandaloneAssignments() {
  return apiClient<{ assignments: any[] }>(
    "/api/admin/standalone-assignments"
  )
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function updateStudent(id: string, payload: any) {
  return apiClient<{ ok: boolean }>(`/api/admin/students/${id}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function deleteStudent(id: string) {
  return apiClient<{ ok: boolean }>(`/api/admin/students/${id}`, {
    method: "DELETE",
  })
}

export async function assignCourse(
  studentId: string,
  courseId: string
) {
  return apiClient<{ ok: boolean }>(
    `/api/admin/students/${studentId}/assign`,
    {
      method: "POST",
      body: { courseId },
    }
  )
}

export async function unassignCourse(
  studentId: string,
  courseId: string
) {
  return apiClient<{ ok: boolean }>(
    `/api/admin/students/${studentId}/assign/${courseId}`,
    { method: "DELETE" }
  )
}

export async function assignTask(
  taskId: string,
  studentIds: string[]
) {
  return apiClient<{ ok: boolean }>(
    `/api/admin/standalone-assignments/${taskId}/assign`,
    {
      method: "POST",
      body: { studentIds },
    }
  )
}

export async function reviewSubmission(
  submissionId: string,
  action: "approve" | "reject",
  feedback: string
) {
  return apiClient<{ ok: boolean }>(
    `/api/admin/assignments/${submissionId}`,
    {
      method: "POST",
      body: { action, feedback },
    }
  )
}
