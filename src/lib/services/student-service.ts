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
  payload: AssignCoursePayload
) {
  return apiClient<{ ok: boolean }>(
    `/api/admin/students/${studentId}/assign`,
    {
      method: "POST",
      body: payload,
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

export async function createStudent(payload: any) {
  return apiClient<{
    ok: boolean
    studentId: string
    emailSent: boolean
    tempPassword?: string
  }>("/api/admin/students", {
    method: "POST",
    body: payload,
  })
}

export async function presignUpload(
  fileName: string,
  fileType: string,
  fileSize: number
) {
  return apiClient<{ presignedUrl: string; publicUrl: string }>(
    "/api/admin/students/upload-presign",
    {
      method: "POST",
      body: { fileName, fileType, fileSize },
    }
  )
}

export async function uploadToS3(url: string, file: File) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })
  if (!res.ok) {
    throw new Error("Failed to upload file to S3")
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type Installment = {
  id: string
  installmentNumber: number
  dueDate: string
  totalAmount: number
  paidAmount: number
  remainingBalance: number
  status: string
  overpaymentReduction: number
  waiverReduction: number
}

export type FeeEnrollment = {
  enrollmentId: string
  courseId: string
  courseTitle: string
  paymentType: string
  planStartDate: string | null
  installments: Installment[]
}

export type AssignCoursePayload = {
  courseId: string
  payment_type: "one_time" | "installment"
  plan_start_date: string
  is_plan_customized: boolean
  custom_installment_count?: number
  custom_installment_amount?: number
  waiver?: {
    waiverType: "full" | "partial"
    amount: number
    reason: string
    notes: string
  }
}

export type RecordPaymentPayload = {
  installmentId: string
  studentId: string
  enrollmentId: string
  amount: number
  paymentDate: string
  paymentMode: "cash" | "upi" | "bank_transfer" | "cheque" | "other"
  referenceNumber?: string | null
  notes?: string | null
  accountId: string
  categoryId?: string | null
  s3Key?: string | null
}

export type ApplyWaiverPayload = {
  enrollmentId: string
  installmentId?: string | null
  waiverType: "full" | "partial"
  waiverAmount: number
  reason: "merit" | "financial_need" | "staff_child" | "special_circumstance" | "management_decision" | "other"
  internalNotes?: string
  studentId: string
}

// ── Fee Queries & Mutations ──────────────────────────────────────────────────

export async function fetchStudentInstallments(studentId: string) {
  return apiClient<{ enrollments: FeeEnrollment[] }>(
    `/api/admin/fee/installments?studentId=${studentId}`
  )
}

export async function recordPayment(payload: RecordPaymentPayload) {
  return apiClient<{ ok: boolean; message?: string }>(
    "/api/admin/fee/record-payment",
    {
      method: "POST",
      body: payload,
    }
  )
}

export async function applyWaiver(payload: ApplyWaiverPayload) {
  return apiClient<{ ok: boolean; message?: string }>(
    "/api/admin/fee/apply-waiver",
    {
      method: "POST",
      body: payload,
    }
  )
}

// ── Payment History Logs ──────────────────────────────────────────────────────

export type PaymentLog = {
  id: string
  installmentId: string
  enrollmentId: string
  amountPaid: number
  paymentDate: string
  paymentMode: string
  referenceNumber: string | null
  notes: string | null
  entryType: "payment" | "waiver" | "adjustment"
  createdAt: string
  recordedByName: string
  installmentNumber: number | null
  courseTitle: string | null
}

export type AddAdjustmentPayload = {
  installmentId: string
  enrollmentId: string
  studentId: string
  /** Positive magnitude — will be stored as a negative adjustment */
  amount: number
  notes: string
}

export async function fetchPaymentLogs(studentId: string) {
  return apiClient<{ logs: PaymentLog[] }>(
    `/api/admin/fee/payment-logs?studentId=${studentId}`
  )
}

export async function addAdjustment(payload: AddAdjustmentPayload) {
  return apiClient<{ ok: boolean; logId: string; message?: string }>(
    "/api/admin/fee/payment-logs",
    {
      method: "POST",
      body: payload,
    }
  )
}

// ── Overdue Installments ──────────────────────────────────────────────────────

export type OverdueInstallment = {
  installmentId: string
  enrollmentId: string
  installmentNumber: number
  totalInstallments: number
  dueDate: string
  totalAmount: number
  paidAmount: number
  balanceDue: number
  waiverReduction: number
  overpaymentReduction: number
  gracePeriodDays: number
  daysOverdue: number
  /** "overdue" | "partially_paid" */
  effectiveStatus: string
  studentId: string
  studentName: string
  courseId: string
  courseTitle: string
}

export type OverdueSummary = {
  totalStudents: number
  totalOverdueAmount: number
  overdueThisMonth: number
}

export type OverdueFilterParams = {
  courseId?: string
  minDaysOverdue?: number
}

export async function fetchOverdueInstallments(
  params: OverdueFilterParams = {}
) {
  const qs = new URLSearchParams()
  if (params.courseId) qs.set("courseId", params.courseId)
  if (params.minDaysOverdue) qs.set("minDaysOverdue", String(params.minDaysOverdue))

  const query = qs.toString() ? `?${qs.toString()}` : ""
  return apiClient<{ summary: OverdueSummary; rows: OverdueInstallment[] }>(
    `/api/admin/fee/overdue${query}`
  )
}

