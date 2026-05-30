export type StudentDetail = {
  id: string
  name: string
  email: string
  status: "active" | "inactive" | "pending"
  phone?: string
  phone_number?: string
  gender?: string
  date_of_birth?: string
  dob?: string
  address?: string
  student_code?: string
  enrollment_date?: string
  student_type?: "online" | "offline" | ""
  profile_image_url?: string
  emergency_contact_name?: string
  emergency_contact_relation?: string
  emergency_contact_phone?: string
  highest_qualification?: string
  current_status?: string
  year_of_passing?: number
  certification_url?: string
  id_proof_url?: string
  verification_status?: "pending" | "verified" | "rejected"
  verified_by?: string
  verified_at?: string
  created_at: string
}

export type AssignedCourse = {
  course_id: string
  title: string
  level: string
  duration: string
  assigned_at: string
  completedSubModules: number
  completedSubModuleIds: string[]
  curriculum: any[]
}

export type CourseRow = {
  id: string
  title: string
  level?: string
  duration?: string
  // Fee fields (migration 019)
  one_time_price?: number | null
  installment_total_price?: number | null
  default_installment_count?: number | null
  default_installment_amount?: number | null
  grace_period_days?: number | null
}

export type Submission = {
  id: string
  assignment_id: string
  assignment_title: string
  assignment_data?: any
  course_id: string
  course_title: string
  submitted_text: string
  submitted_files?: { url: string; name: string; type: string }[]
  submitted_at: string
  reviewed_at?: string
  status: "pending" | "approved" | "rejected"
  feedback?: string
}

export const STUDENT_STATUS_CFG = {
  active: {
    label: "Active",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  pending: {
    label: "Pending",
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  inactive: {
    label: "Inactive",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
}

export const VERIFICATION_CFG = {
  pending: {
    label: "Under Review",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  verified: {
    label: "Verified",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected / Revise",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
}

export const SUBMISSION_STATUS_CFG = {
  pending: {
    label: "Under Review",
    cls: "bg-amber-50 border-amber-200 text-amber-700",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    cls: "bg-green-50 border-green-200 text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Revise",
    cls: "bg-red-50 border-red-200 text-red-600",
    dot: "bg-red-400",
  },
}

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function buildWeekProgress(
  curriculum: any[],
  completedIds: string[]
) {
  const completedSet = new Set(completedIds)
  return (curriculum || []).map((week: any) => {
    const days = (week.days || []).map((day: any) => {
      const lessons = (day.subModules || []).map((mod: any) => ({
        id: mod.id,
        title: mod.title || mod.assignmentData?.title || mod.id,
        type: mod.type || "lesson",
        done: completedSet.has(mod.id),
      }))
      return {
        id: day.id,
        label: day.label || day.title || "Day",
        lessons,
      }
    })
    const total = days.reduce(
      (a: number, d: any) => a + d.lessons.length,
      0
    )
    const done = days.reduce(
      (a: number, d: any) =>
        a + d.lessons.filter((l: any) => l.done).length,
      0
    )
    return { id: week.id, title: week.title, days, total, done }
  })
}
