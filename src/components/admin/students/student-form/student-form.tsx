"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  User,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  GraduationCap,
  Loader2,
  ShieldCheck,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DatePickerField } from "@/components/admin/employees/employee-form/date-picker-field"
import { Dialog } from "@/components/ui/dialog"
import { useStudentForm } from "@/lib/hooks/useStudentForm"

// ── Shared style tokens (same as employee form) ───────────────────────────────
const inputCls =
  "w-full h-10 rounded-md border border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
const textareaCls =
  "w-full rounded-md border border-default bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
const labelCls = "block text-sm font-semibold text-foreground mb-1.5"

// ── Small shared primitives ───────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-default">
      <Icon className="size-4 text-primary" />
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

function OptionalTag() {
  return <span className="text-xs font-normal text-muted ml-1">(optional)</span>
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_IMAGE = "image/jpeg,image/png,image/webp"
const ACCEPTED_DOC = ".pdf,.jpg,.jpeg,.png"

const QUALIFICATION_LEVELS = [
  "SSLC",
  "Plus Two",
  "Diploma",
  "Degree",
  "PG",
  "PhD",
  "Other",
] as const

const CURRENT_STATUS_OPTIONS = [
  { value: "studying", label: "Studying" },
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "other", label: "Other" },
]

// ── File upload helpers ───────────────────────────────────────────────────────
type UploadState = {
  file: File | null
  url: string
  status: "idle" | "uploading" | "done" | "error"
  error?: string
}

function emptyUpload(): UploadState {
  return { file: null, url: "", status: "idle" }
}



function formatDateToString(dateVal: any): string {
  if (!dateVal) return ""
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split("T")[0]
  }
  if (typeof dateVal === "string") {
    return dateVal.split("T")[0]
  }
  return ""
}

// ── Main Form ─────────────────────────────────────────────────────────────────
type StudentFormProps = {
  student?: any
}

export function StudentForm({ student }: StudentFormProps = {}) {
  const router = useRouter()
  const isEdit = !!student

  const { uploadFile, saveStudent, isSaving } = useStudentForm()

  // ── Personal Info ────────────────────────────────────────────────────────
  const [name, setName] = useState(student?.name ?? "")
  const [email, setEmail] = useState(student?.email ?? "")
  const [phone, setPhone] = useState(student?.phone ?? student?.phone_number ?? "")
  const [dob, setDob] = useState(formatDateToString(student?.date_of_birth || student?.dob))
  const [gender, setGender] = useState(student?.gender ?? "")
  const [address, setAddress] = useState(student?.address ?? "")
  const [studentType, setStudentType] = useState<"online" | "offline" | "">(student?.student_type ?? "offline")

  // Edit-only Core details
  const [status, setStatus] = useState<"active" | "inactive" | "pending">(student?.status ?? "active")
  const [studentCode, setStudentCode] = useState(student?.student_code ?? "")
  const [enrollmentDate, setEnrollmentDate] = useState(
    formatDateToString(student?.enrollment_date || student?.created_at)
  )

  // Profile photo
  const [profileImageUrl, setProfileImageUrl] = useState(student?.profile_image_url ?? "")
  const [profileImageUploading, setProfileImageUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  // Emergency contact (collapsible)
  const [emergencyOpen, setEmergencyOpen] = useState(
    !!(student?.emergency_contact_name || student?.emergency_contact_phone)
  )
  const [ecName, setEcName] = useState(student?.emergency_contact_name ?? "")
  const [ecRelation, setEcRelation] = useState(student?.emergency_contact_relation ?? "")
  const [ecPhone, setEcPhone] = useState(student?.emergency_contact_phone ?? "")

  // ── Academic Profile ─────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(
    !!(student?.highest_qualification || student?.current_status)
  )
  const [qualification, setQualification] = useState(student?.highest_qualification ?? "")
  const [currentStatus, setCurrentStatus] = useState(student?.current_status ?? "")
  const [yearOfPassing, setYearOfPassing] = useState(
    student?.year_of_passing ? String(student.year_of_passing) : ""
  )

  // Certification upload (public S3)
  const [certUpload, setCertUpload] = useState<UploadState>(() => {
    if (student?.certification_url) {
      return { file: null, url: student.certification_url, status: "done" }
    }
    return emptyUpload()
  })
  const certInputRef = useRef<HTMLInputElement | null>(null)

  // ID proof upload (public S3)
  const [idUpload, setIdUpload] = useState<UploadState>(() => {
    if (student?.id_proof_url) {
      return { file: null, url: student.id_proof_url, status: "done" }
    }
    return emptyUpload()
  })
  const idInputRef = useRef<HTMLInputElement | null>(null)

  // ── Submit state ─────────────────────────────────────────────────────────
  const saving = isSaving
  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null)
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${tempPasswordModal}`)
    setCopied(true)
    toast.success("Credentials copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  // ── File helpers ─────────────────────────────────────────────────────────
  function validateFile(file: File, imageOnly = false): string | undefined {
    if (imageOnly && !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      return "Invalid format. Accepted: JPG, PNG, WEBP."
    }
    if (!imageOnly && !/\.(pdf|jpg|jpeg|png)$/i.test(file.name)) {
      return "Invalid format. Accepted: PDF, JPG, PNG."
    }
    if (file.size > MAX_BYTES) return "File exceeds 5 MB limit."
    return undefined
  }

  async function handleProfilePhoto(file: File | null) {
    if (!file) return
    const err = validateFile(file, true)
    if (err) { toast.error(err); return }
    setProfileImageUploading(true)
    try {
      const url = await uploadFile(file)
      setProfileImageUrl(url)
      toast.success("Profile photo uploaded.")
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed")
    } finally {
      setProfileImageUploading(false)
    }
  }

  async function handleDocUpload(
    file: File | null,
    setter: React.Dispatch<React.SetStateAction<UploadState>>,
  ) {
    if (!file) {
      setter(emptyUpload())
      return
    }
    const err = validateFile(file)
    if (err) {
      setter({ file, url: "", status: "error", error: err })
      return
    }
    setter({ file, url: "", status: "uploading" })
    try {
      const url = await uploadFile(file)
      setter({ file, url, status: "done" })
    } catch (e: any) {
      setter({ file, url: "", status: "error", error: e.message ?? "Upload failed" })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (certUpload.status === "uploading" || idUpload.status === "uploading") {
      toast.error("Please wait for uploads to finish.")
      return
    }

    saveStudent(
      {
        payload: {
          name,
          email,
          phone: phone || undefined,
          date_of_birth: dob || undefined,
          gender: gender || undefined,
          address: address || undefined,
          student_type: studentType || undefined,
          profile_image_url: profileImageUrl || undefined,
          emergency_contact_name: ecName || undefined,
          emergency_contact_relation: ecRelation || undefined,
          emergency_contact_phone: ecPhone || undefined,
          // Academic profile
          highest_qualification: qualification || undefined,
          current_status: currentStatus || undefined,
          year_of_passing: yearOfPassing ? Number(yearOfPassing) : undefined,
          certification_url: certUpload.url || undefined,
          id_proof_url: idUpload.url || undefined,
          // Edit-only fields
          student_code: isEdit ? studentCode : undefined,
          enrollment_date: isEdit ? enrollmentDate || undefined : undefined,
          status: isEdit ? status : undefined,
        },
        isEdit,
        id: student?.id,
      },
      {
        onSuccess: (data: any) => {
          if (!isEdit && data.tempPassword) {
            setTempPasswordModal(data.tempPassword)
            setCreatedStudentId(data.studentId)
            toast.warning("Student created, but welcome email failed to send.")
          } else {
            toast.success(isEdit ? "Student updated successfully!" : "Student created successfully!")
            router.push(`/admin/students/${isEdit ? student.id : data.studentId}`)
          }
        },
      }
    )
  }

  const isUploading =
    profileImageUploading ||
    certUpload.status === "uploading" ||
    idUpload.status === "uploading"

  return (
    <form onSubmit={handleSubmit} className="space-y-8 mx-auto">
      {/* ── Section 1: Personal Information ─────────────────────────────── */}
      <section className="rounded-md border border-default bg-white p-6 space-y-5">
        <SectionHeader icon={User} title="Personal Information" />

        {/* Profile Photo */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-dashed border-default">
          <div className="relative group">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt="Profile"
                className="size-24 rounded-md object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div className="size-24 rounded-md bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center ring-4 ring-white shadow-md">
                {name ? (
                  name
                    .split(" ")
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                ) : (
                  <User className="size-8" />
                )}
              </div>
            )}
            {profileImageUploading && (
              <div className="absolute inset-0 rounded-md bg-black/40 flex items-center justify-center text-white">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left">
            <h4 className="font-bold text-sm text-foreground">Profile Photo</h4>
            <p className="text-xs text-muted">JPEG, PNG or WEBP · max 5 MB</p>
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={profileImageUploading}
                className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-50 cursor-pointer"
              >
                Upload Photo
              </button>
              {profileImageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setProfileImageUrl("")
                    if (photoInputRef.current) photoInputRef.current.value = ""
                  }}
                  className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept={ACCEPTED_IMAGE}
              className="sr-only"
              onChange={(e) => handleProfilePhoto(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          {/* Full Name */}
          <div className="sm:col-span-3">
            <label className={labelCls}>Full Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Aisha Khan"
            />
          </div>

          {/* Email */}
          <div className="sm:col-span-3">
            <label className={labelCls}>Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} pl-8`}
                placeholder="student@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputCls} pl-8`}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Gender
            </label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— Select —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Date of Birth
            </label>
            <DatePickerField
              value={dob}
              onChange={setDob}
              placeholder="Pick date of birth"
            />
          </div>

          {/* Student Type */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Student Type *</label>
            <Select
              value={studentType}
              onValueChange={(v) => setStudentType(v as "online" | "offline")}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— Select —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Student Status (Edit only) */}
          {isEdit && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Student Status *</label>
              <Select
                value={status}
                onValueChange={(v: any) => setStatus(v)}
              >
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue placeholder="— Select —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student Code (Edit only) */}
          {isEdit && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Student Code *</label>
              <input
                required
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="STU-YYYY-XXXXXX"
              />
            </div>
          )}

          {/* Enrollment Date (Edit only) */}
          {isEdit && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Enrollment Date</label>
              <DatePickerField
                value={enrollmentDate}
                onChange={setEnrollmentDate}
                placeholder="Pick enrollment date"
              />
            </div>
          )}

          {/* Address */}
          <div className="sm:col-span-6">
            <label className={labelCls}>
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-3 size-3.5 text-muted pointer-events-none" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className={`${textareaCls} pl-8 resize-none`}
                placeholder="Street, City, State, PIN"
              />
            </div>
          </div>

          {/* Emergency Contact (collapsible) */}
          <div className="sm:col-span-6">
            <button
              type="button"
              onClick={() => setEmergencyOpen((p) => !p)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 hover:text-primary transition-colors"
            >
              {emergencyOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              Emergency Contact
            </button>
            {emergencyOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-default bg-subtle p-4">
                <div>
                  <label className={labelCls}>
                    Contact Name
                  </label>
                  <input
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    className={inputCls}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Relationship
                  </label>
                  <Select value={ecRelation} onValueChange={setEcRelation}>
                    <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                      <SelectValue placeholder="— Select —" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Father",
                        "Mother",
                        "Spouse",
                        "Sibling",
                        "Friend",
                        "Guardian",
                        "Other",
                      ].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={ecPhone}
                    onChange={(e) => setEcPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Academic Profile (all optional) ───────────────────── */}
      <section className="rounded-md border border-default bg-white p-6 space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeader icon={GraduationCap} title="Academic Profile" />
          <button
            type="button"
            onClick={() => setProfileOpen((p) => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
          >
            {profileOpen ? (
              <>
                <ChevronUp className="size-3.5" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" /> Expand
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-muted -mt-2">
          All fields in this section are optional and can be filled in later.
        </p>

        {profileOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
            {/* Highest Qualification */}
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Highest Qualification
              </label>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue placeholder="— Select —" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_LEVELS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Status */}
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Current Status
              </label>
              <Select value={currentStatus} onValueChange={setCurrentStatus}>
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue placeholder="— Select —" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year of Passing */}
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Year of Passing
              </label>
              <input
                type="number"
                min="1970"
                max={new Date().getFullYear()}
                value={yearOfPassing}
                onChange={(e) => setYearOfPassing(e.target.value)}
                className={inputCls}
                placeholder={`e.g. ${new Date().getFullYear() - 1}`}
              />
            </div>

            {/* Certification Upload */}
            <div className="sm:col-span-3">
              <label className={labelCls}>
                Qualification Certificate
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => certInputRef.current?.click()}
                  disabled={certUpload.status === "uploading"}
                  className="flex items-center gap-2 rounded-md border border-dashed border-default bg-subtle px-4 py-3 text-sm text-muted hover:border-primary hover:text-primary transition-colors w-full disabled:opacity-50 cursor-pointer"
                >
                  {certUpload.status === "uploading" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading…
                    </>
                  ) : certUpload.status === "done" ? (
                    <>
                      <ShieldCheck className="size-4 text-green-600" />
                      <span className="truncate text-green-700 font-medium">
                        {certUpload.file?.name}
                      </span>
                    </>
                  ) : (
                    "Click to upload PDF / JPG / PNG"
                  )}
                </button>
                {certUpload.status === "error" && (
                  <p className="text-xs text-red-600">{certUpload.error}</p>
                )}
                {certUpload.status === "done" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCertUpload(emptyUpload())
                      if (certInputRef.current) certInputRef.current.value = ""
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={certInputRef}
                  type="file"
                  accept={ACCEPTED_DOC}
                  className="sr-only"
                  onChange={(e) =>
                    handleDocUpload(e.target.files?.[0] ?? null, setCertUpload)
                  }
                />
              </div>
            </div>

            {/* ID Proof Upload */}
            <div className="sm:col-span-3">
              <label className={labelCls}>
                ID Proof
                <span className="text-xs text-muted mb-2">
                  Aadhaar / Passport / Driving Licence
                </span>
              </label>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => idInputRef.current?.click()}
                  disabled={idUpload.status === "uploading"}
                  className="flex items-center gap-2 rounded-md border border-dashed border-default bg-subtle px-4 py-3 text-sm text-muted hover:border-primary hover:text-primary transition-colors w-full disabled:opacity-50 cursor-pointer"
                >
                  {idUpload.status === "uploading" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading…
                    </>
                  ) : idUpload.status === "done" ? (
                    <>
                      <ShieldCheck className="size-4 text-green-600" />
                      <span className="truncate text-green-700 font-medium">
                        {idUpload.file?.name}
                      </span>
                    </>
                  ) : (
                    "Click to upload PDF / JPG / PNG"
                  )}
                </button>
                {idUpload.status === "error" && (
                  <p className="text-xs text-red-600">{idUpload.error}</p>
                )}
                {idUpload.status === "done" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIdUpload(emptyUpload())
                      if (idInputRef.current) idInputRef.current.value = ""
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={idInputRef}
                  type="file"
                  accept={ACCEPTED_DOC}
                  className="sr-only"
                  onChange={(e) =>
                    handleDocUpload(e.target.files?.[0] ?? null, setIdUpload)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Sticky footer bar (same layout as employee form) ────────────── */}
      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-3 rounded-md border border-default bg-white/80 p-2 backdrop-blur-md ">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/students")}
          disabled={saving || isUploading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || isUploading}>
          {saving
            ? (isEdit ? "Saving…" : "Creating…")
            : isUploading
              ? "Uploading…"
              : (isEdit ? "Save Changes" : "Create Student")}
        </Button>
      </div>

      <Dialog
        open={!!tempPasswordModal}
        title="Welcome Email Delivery Failed"
        onClose={() => {
          if (createdStudentId) {
            router.push(`/admin/students/${createdStudentId}`)
          }
          setTempPasswordModal(null)
        }}
      >
        <div className="space-y-4">
          <p className="text-xs text-secondary">
            The student was created successfully, but the welcome email could not be sent due to a mail delivery error.
            Please share the credentials below manually with the student so they can log in.
          </p>
          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Student Credentials
            </div>
            <div className="text-xs text-foreground">
              <span className="font-semibold">Email:</span> {email}
            </div>
            <div className="text-xs text-foreground flex items-center justify-between">
              <div>
                <span className="font-semibold">Password:</span>{" "}
                <span className="font-mono bg-white px-2 py-0.5 border border-default rounded text-xs select-all">
                  {tempPasswordModal}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={() => {
                if (createdStudentId) {
                  router.push(`/admin/students/${createdStudentId}`)
                }
                setTempPasswordModal(null)
              }}
            >
              Go to Student Profile
            </Button>
          </div>
        </div>
      </Dialog>
    </form>
  )
}
