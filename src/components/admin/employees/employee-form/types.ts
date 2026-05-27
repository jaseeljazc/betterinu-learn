export const PREDEFINED_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MongoDB", "REST API", "GraphQL", "Docker", "Git",
  "Excel", "Power BI", "Figma", "UI/UX Design", "Communication", "Leadership",
  "Project Management", "Agile / Scrum", "Problem Solving", "Data Analysis",
  "Machine Learning", "AWS", "Azure", "Linux", "Testing / QA", "Marketing",
  "Content Writing", "Customer Service", "Sales", "Finance", "HR",
]

export const QUALIFICATION_LEVELS = ["SSLC", "Plus Two", "Diploma", "Degree", "PG", "Other"] as const
export type Qualification = (typeof QUALIFICATION_LEVELS)[number]

export const QUAL_RANK: Record<Qualification, number> = {
  SSLC: 1,
  "Plus Two": 2,
  Diploma: 3,
  Degree: 4,
  PG: 5,
  Other: 0,
}

export const CERT_SLOTS = [
  { key: "sslc", label: "SSLC Certificate", minQual: "SSLC" as Qualification },
  { key: "plusTwo", label: "Plus Two Certificate", minQual: "Plus Two" as Qualification },
  { key: "degree", label: "Degree Certificate", minQual: "Degree" as Qualification },
  { key: "pg", label: "PG Certificate", minQual: "PG" as Qualification },
]

export const MANDATORY_DOCS = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
  { key: "passbook", label: "Bank Passbook" },
] as const

export const ACCEPTED = ".pdf,.jpg,.jpeg,.png"
export const MAX_BYTES = 5 * 1024 * 1024

export type EmergencyContact = {
  name: string
  relationship: string
  phone: string
}

export type OtherDoc = {
  id: string
  name: string
  file: File | null
  s3Key?: string
  status?: "idle" | "uploading" | "done" | "error"
  error?: string
  presignedUrl?: string
  fileName?: string
}

export type FileSlot = {
  file: File | null
  s3Key?: string
  status?: "idle" | "uploading" | "done" | "error"
  error?: string
  presignedUrl?: string
  fileName?: string
}

export const inputCls = "w-full h-10 rounded-md border border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
export const textareaCls = "w-full rounded-md border border-default bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
export const labelCls = "block text-sm font-semibold text-foreground mb-1.5"

export function isImageFile(file: File) {
  return /\.(jpg|jpeg|png)$/i.test(file.name)
}
