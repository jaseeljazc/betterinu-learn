"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  User, Mail, Phone, MapPin, Briefcase, DollarSign,
  Shield, CheckCircle2, ChevronDown, ChevronUp, Plus,
  X, Upload, Eye, Trash2, Search, Sparkles, FileText,
  Loader2,
} from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { clientAuth } from "@/lib/firebase-client"
import { useDepartments } from "@/lib/hooks/useDepartments"
import { useManagers } from "@/lib/hooks/useManagers"
import type { Employee } from "@/types"
import { ImageCropper } from "@/components/ui/image-cropper"

const PREDEFINED_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MongoDB", "REST API", "GraphQL", "Docker", "Git",
  "Excel", "Power BI", "Figma", "UI/UX Design", "Communication", "Leadership",
  "Project Management", "Agile / Scrum", "Problem Solving", "Data Analysis",
  "Machine Learning", "AWS", "Azure", "Linux", "Testing / QA", "Marketing",
  "Content Writing", "Customer Service", "Sales", "Finance", "HR",
]

const QUALIFICATION_LEVELS = ["SSLC", "Plus Two", "Diploma", "Degree", "PG", "Other"] as const
type Qualification = (typeof QUALIFICATION_LEVELS)[number]

const QUAL_RANK: Record<Qualification, number> = {
  SSLC: 1, "Plus Two": 2, Diploma: 3, Degree: 4, PG: 5, Other: 0,
}

const CERT_SLOTS = [
  { key: "sslc", label: "SSLC Certificate", minQual: "SSLC" as Qualification },
  { key: "plusTwo", label: "Plus Two Certificate", minQual: "Plus Two" as Qualification },
  { key: "degree", label: "Degree Certificate", minQual: "Degree" as Qualification },
  { key: "pg", label: "PG Certificate", minQual: "PG" as Qualification },
]

const MANDATORY_DOCS = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
  { key: "passbook", label: "Bank Passbook" },
] as const

const ACCEPTED = ".pdf,.jpg,.jpeg,.png"
const MAX_BYTES = 5 * 1024 * 1024

type EmployeeFormProps = {
  employee?: Employee
  roles?: { id: string; name: string; label: string }[]
}

type EmergencyContact = {
  name: string
  relationship: string
  phone: string
}

type OtherDoc = {
  id: string
  name: string
  file: File | null
  s3Key?: string
  status?: "idle" | "uploading" | "done" | "error"
  error?: string
}

type FileSlot = {
  file: File | null
  s3Key?: string
  status?: "idle" | "uploading" | "done" | "error"
  error?: string
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
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

function isImageFile(file: File) {
  return /\.(jpg|jpeg|png)$/i.test(file.name)
}

export function EmployeeForm({ employee, roles = [] }: EmployeeFormProps) {
  const router = useRouter()
  const isEdit = !!employee
  const isDraftRef = useRef(false)
  const submittingRef = useRef(false)

  const inputCls = "w-full h-10 rounded-md border border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
  const textareaCls = "w-full rounded-md border border-default bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
  const labelCls = "block text-sm font-semibold text-foreground mb-1.5"

  const [fullName, setFullName]   = useState(employee?.fullName ?? "")
  const [email, setEmail]         = useState(employee?.email ?? "")
  const [phone, setPhone]         = useState(employee?.phone ?? "")
  const [dob, setDob]             = useState(employee?.dateOfBirth?.slice(0, 10) ?? "")
  const [gender, setGender]       = useState(employee?.gender ?? "")
  const [address, setAddress]     = useState(employee?.address ?? "")

  const [reportingManagerId, setReportingManagerId] = useState(employee?.reportingManager?.id ?? "")
  const [managerSearch, setManagerSearch] = useState(employee?.reportingManager?.fullName ?? "")
  const [managerOpen, setManagerOpen] = useState(false)
  const managerInputRef = useRef<HTMLInputElement>(null)

  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [emergency, setEmergency] = useState<EmergencyContact>({ name: "", relationship: "", phone: "" })

  const [departmentId, setDepartmentId]       = useState(employee?.department?.id ?? "")
  const [designation, setDesignation]         = useState(employee?.designation ?? "")
  const [employmentType, setEmploymentType]   = useState(employee?.employmentType ?? "full_time")
  const [monthlySalary, setMonthlySalary]     = useState(String(employee?.monthlySalary ?? ""))
  const [dateOfJoining, setDateOfJoining]     = useState(employee?.dateOfJoining?.slice(0, 10) ?? "")
  const [status, setStatus]                   = useState(employee?.status ?? "active")

  const [skills, setSkills] = useState<string[]>(employee?.skills ?? [])
  const [skillInput, setSkillInput] = useState("")
  const [skillDropOpen, setSkillDropOpen] = useState(false)

  const [qualification, setQualification] = useState<Qualification | "">(() => {
    const q = employee?.qualification as string | undefined;
    if (!q) return "";
    return (QUALIFICATION_LEVELS.find((level) => level.toLowerCase() === q.toLowerCase()) as Qualification) ?? "";
  })
  
  const [certFiles, setCertFiles] = useState<Record<string, FileSlot>>(() => {
    const res: Record<string, FileSlot> = {}
    if (employee?.documents) {
      for (const doc of employee.documents) {
        if (["sslc", "plusTwo", "degree", "pg"].includes(doc.docType)) {
          res[doc.docType] = {
            file: null,
            s3Key: doc.s3Key,
            status: "done",
            fileName: doc.fileName,
            presignedUrl: doc.presignedUrl,
          } as any
        }
      }
    }
    return res
  })

  const [mandatoryFiles, setMandatoryFiles] = useState<Record<string, FileSlot>>(() => {
    const res: Record<string, FileSlot> = {}
    if (employee?.documents) {
      for (const doc of employee.documents) {
        if (["aadhaar", "pan", "passbook"].includes(doc.docType)) {
          res[doc.docType] = {
            file: null,
            s3Key: doc.s3Key,
            status: "done",
            fileName: doc.fileName,
            presignedUrl: doc.presignedUrl,
          } as any
        }
      }
    }
    return res
  })

  const [otherDocs, setOtherDocs] = useState<OtherDoc[]>(() => {
    if (employee?.documents) {
      const others = employee.documents.filter(d => d.docType === "other")
      if (others.length > 0) {
        return others.map(doc => ({
          id: doc.id,
          name: doc.docName ?? "",
          file: null,
          s3Key: doc.s3Key,
          status: "done",
          fileName: doc.fileName,
          presignedUrl: doc.presignedUrl,
        } as any))
      }
    }
    return [{ id: crypto.randomUUID(), name: "", file: null }]
  })

  const [docsToDelete, setDocsToDelete] = useState<string[]>([])
  const [profilePhotoKey, setProfilePhotoKey] = useState(employee?.profilePhotoKey ?? "")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(employee?.profilePhotoUrl ?? "")
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const [hasAdminAccess, setHasAdminAccess] = useState(!!employee?.adminAccount)
  const [roleId, setRoleId] = useState("")
  const [saving, setSaving] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const isUploading = useMemo(() => {
    const checkSlot = (s: FileSlot | undefined) => s?.status === "uploading"
    const certsUploading = Object.values(certFiles).some(checkSlot)
    const mandUploading = Object.values(mandatoryFiles).some(checkSlot)
    const othersUploading = otherDocs.some((d) => d.status === "uploading")
    return certsUploading || mandUploading || othersUploading
  }, [certFiles, mandatoryFiles, otherDocs])

  const { data: departments = [], isLoading: deptLoading } = useDepartments()
  const { managers, isLoading: managersLoading } = useManagers(employee?.id)

  const completionPercent = useMemo(() => {
    const required = [
      fullName.trim() !== "",
      email.trim() !== "",
      !!(mandatoryFiles["aadhaar"]?.file || mandatoryFiles["aadhaar"]?.s3Key),
      !!(mandatoryFiles["pan"]?.file || mandatoryFiles["pan"]?.s3Key),
      !!(mandatoryFiles["passbook"]?.file || mandatoryFiles["passbook"]?.s3Key),
    ]
    const filled = required.filter(Boolean).length
    return Math.round((filled / required.length) * 100)
  }, [fullName, email, mandatoryFiles])

  const filteredManagers = useMemo(() => {
    const q = managerSearch.toLowerCase()
    return managers.filter((m) => m.fullName.toLowerCase().includes(q))
  }, [managers, managerSearch])

  const filteredSkills = useMemo(() => {
    const q = skillInput.toLowerCase().trim()
    if (!q) return PREDEFINED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 10)
    return PREDEFINED_SKILLS.filter((s) => s.toLowerCase().includes(q) && !skills.includes(s))
  }, [skillInput, skills])

  const visibleCertSlots = useMemo(() => {
    if (!qualification) return []
    const rank = QUAL_RANK[qualification as Qualification] ?? 0
    return CERT_SLOTS.filter((c) => rank >= QUAL_RANK[c.minQual])
  }, [qualification])

  function selectManager(id: string, name: string) {
    setReportingManagerId(id); setManagerSearch(name); setManagerOpen(false)
  }
  function clearManager() {
    setReportingManagerId(""); setManagerSearch(""); managerInputRef.current?.focus()
  }
  function addSkill(skill: string) {
    const s = skill.trim()
    if (!s || skills.includes(s)) return
    setSkills((prev) => [...prev, s]); setSkillInput(""); setSkillDropOpen(false)
  }
  function removeSkill(skill: string) { setSkills((prev) => prev.filter((s) => s !== skill)) }
  function validateFile(file: File): string | undefined {
    if (!/\.(pdf|jpg|jpeg|png)$/i.test(file.name)) return "Invalid format. Accepted: PDF, JPG, PNG."
    if (file.size > MAX_BYTES) return "File exceeds 5 MB limit."
    return undefined
  }

  async function uploadSingleFile(file: File, docType: string): Promise<{ s3Key: string; error?: string }> {
    try {
      const presignRes = await fetch("/api/admin/employees/documents/presign", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ employeeId: null, docType, fileName: file.name, fileType: file.type, fileSize: file.size }),
      })
      if (!presignRes.ok) {
        const d = await presignRes.json()
        throw new Error(d.error ?? "Failed to get upload URL")
      }
      const { presignedUrl, s3Key } = await presignRes.json()
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT", headers: { "Content-Type": file.type }, body: file, redirect: "error", mode: "cors",
      })
      if (!uploadRes.ok && uploadRes.status !== 0) throw new Error(`S3 upload failed: HTTP ${uploadRes.status}`)
      return { s3Key }
    } catch (err) {
      console.error(`[uploadSingleFile] ${docType}:`, err)
      return { s3Key: "", error: err instanceof Error ? err.message : "Upload failed" }
    }
  }

  async function deleteSingleFile(s3Key?: string) {
    if (!s3Key) return
    try {
      await fetch("/api/admin/employees/documents/delete-pending", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ s3Key }),
      })
    } catch (err) { console.error("[deleteSingleFile] Error:", err) }
  }

  async function handleCertFile(key: string, file: File | null) {
    const existing = certFiles[key]
    if (!file) {
      if (existing?.s3Key) {
        if (existing.file === null) {
          setDocsToDelete((prev) => [...prev, existing.s3Key!])
        } else {
          await deleteSingleFile(existing.s3Key)
        }
      }
      setCertFiles((prev) => ({ ...prev, [key]: { file: null } }));
      return
    }

    if (existing?.s3Key) {
      if (existing.file === null) {
        setDocsToDelete((prev) => [...prev, existing.s3Key!])
      } else {
        await deleteSingleFile(existing.s3Key)
      }
    }

    const error = validateFile(file)
    if (error) { setCertFiles((prev) => ({ ...prev, [key]: { file, error, status: "error" } })); return }
    setCertFiles((prev) => ({ ...prev, [key]: { file, status: "uploading" } }))
    const res = await uploadSingleFile(file, key)
    setCertFiles((prev) => ({ ...prev, [key]: { file, ...res, status: res.error ? "error" : "done" } }))
  }

  async function handleMandatoryFile(key: string, file: File | null) {
    const existing = mandatoryFiles[key]
    if (!file) {
      if (existing?.s3Key) {
        if (existing.file === null) {
          setDocsToDelete((prev) => [...prev, existing.s3Key!])
        } else {
          await deleteSingleFile(existing.s3Key)
        }
      }
      setMandatoryFiles((prev) => ({ ...prev, [key]: { file: null } }));
      return
    }

    if (existing?.s3Key) {
      if (existing.file === null) {
        setDocsToDelete((prev) => [...prev, existing.s3Key!])
      } else {
        await deleteSingleFile(existing.s3Key)
      }
    }

    const error = validateFile(file)
    if (error) { setMandatoryFiles((prev) => ({ ...prev, [key]: { file, error, status: "error" } })); return }
    setMandatoryFiles((prev) => ({ ...prev, [key]: { file, status: "uploading" } }))
    const res = await uploadSingleFile(file, key)
    setMandatoryFiles((prev) => ({ ...prev, [key]: { file, ...res, status: res.error ? "error" : "done" } }))
  }

  function addOtherDoc() { setOtherDocs((prev) => [...prev, { id: crypto.randomUUID(), name: "", file: null }]) }
  
  async function removeOtherDoc(id: string) {
    const existing = otherDocs.find(d => d.id === id)
    if (existing?.s3Key) {
      if (existing.file === null) {
        setDocsToDelete((prev) => [...prev, existing.s3Key!])
      } else {
        await deleteSingleFile(existing.s3Key)
      }
    }
    setOtherDocs((prev) => prev.filter((d) => d.id !== id))
  }

  async function updateOtherDoc(id: string, field: "name" | "file", value: string | File | null) {
    if (field === "file") {
      const existing = otherDocs.find(d => d.id === id)
      if (existing?.s3Key) {
        if (existing.file === null) {
          setDocsToDelete((prev) => [...prev, existing.s3Key!])
        } else {
          await deleteSingleFile(existing.s3Key)
        }
      }
      if (value instanceof File) {
        const error = validateFile(value)
        if (error) { setOtherDocs((prev) => prev.map((d) => d.id === id ? { ...d, file: value, error, status: "error" } : d)); return }
        setOtherDocs((prev) => prev.map((d) => d.id === id ? { ...d, file: value, status: "uploading" } : d))
        const res = await uploadSingleFile(value, "other")
        setOtherDocs((prev) => prev.map((d) => d.id === id ? { ...d, file: value, ...res, status: res.error ? "error" : "done" } : d))
        return
      }
      setOtherDocs((prev) => prev.map((d) => d.id === id ? { ...d, file: null, error: undefined, status: "idle", s3Key: undefined } : d))
      return
    }
    setOtherDocs((prev) => prev.map((d) => d.id === id ? { ...d, name: value as string } : d))
  }

  function handlePhotoChange(file: File | null) {
    if (!file) return
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setOriginalFile(file)
    }
    reader.readAsDataURL(file)
  }

  async function handleCropSave(croppedBlob: Blob) {
    if (!originalFile) return
    setCropSrc(null)
    setPhotoUploading(true)
    try {
      const croppedFile = new File([croppedBlob], originalFile.name, { type: "image/jpeg" })
      
      // Defer delete or delete immediately previous upload
      if (profilePhotoKey) {
        if (employee?.profilePhotoKey === profilePhotoKey) {
          setDocsToDelete((prev) => [...prev, profilePhotoKey])
        } else {
          await deleteSingleFile(profilePhotoKey)
        }
      }

      const res = await uploadSingleFile(croppedFile, "profile-photo")
      if (res.error) throw new Error(res.error)

      setProfilePhotoKey(res.s3Key)
      setProfilePhotoUrl(URL.createObjectURL(croppedFile))
      toast.success("Profile photo cropped and uploaded successfully.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload cropped photo")
    } finally {
      setPhotoUploading(false)
      setOriginalFile(null)
    }
  }

  async function handleRemovePhoto() {
    if (!profilePhotoKey) return
    if (employee?.profilePhotoKey === profilePhotoKey) {
      setDocsToDelete((prev) => [...prev, profilePhotoKey])
    } else {
      await deleteSingleFile(profilePhotoKey)
    }
    setProfilePhotoKey("")
    setProfilePhotoUrl("")
    if (photoInputRef.current) photoInputRef.current.value = ""
    toast.success("Profile photo removed.")
  }

  async function doSaveRequest(payload: object) {
    const url = isEdit ? `/api/admin/employees/${employee!.id}` : "/api/admin/employees"
    const method = isEdit ? "PATCH" : "POST"
    async function send() {
      return fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) })
    }
    let res = await send()
    if (res.status === 401) {
      const user = clientAuth.currentUser
      if (user) {
        const freshToken = await user.getIdToken(true)
        await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: freshToken }) })
        res = await send()
      }
    }
    return res
  }

  async function confirmAllDocs(employeeId: string) {
    const queue: { key: string; docType: string; docName?: string; file: File; s3Key: string }[] = []
    for (const doc of MANDATORY_DOCS) {
      const slot = mandatoryFiles[doc.key]
      if (slot?.file && slot.s3Key && slot.status === "done") queue.push({ key: doc.key, docType: doc.key, file: slot.file, s3Key: slot.s3Key })
    }
    for (const slot of CERT_SLOTS) {
      const certSlot = certFiles[slot.key]
      if (certSlot?.file && certSlot.s3Key && certSlot.status === "done") queue.push({ key: slot.key, docType: slot.key, file: certSlot.file, s3Key: certSlot.s3Key })
    }
    for (const doc of otherDocs) {
      if (doc.file && doc.s3Key && doc.status === "done") queue.push({ key: doc.id, docType: "other", docName: doc.name || undefined, file: doc.file, s3Key: doc.s3Key })
    }
    if (queue.length === 0) return

    let failCount = 0
    for (const item of queue) {
      try {
        const confirmRes = await fetch("/api/admin/employees/documents/confirm", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ employeeId, docType: item.docType, docName: item.docName, s3Key: item.s3Key, fileName: item.file.name, fileType: item.file.type, fileSize: item.file.size }),
        })
        if (!confirmRes.ok) throw new Error((await confirmRes.json()).error ?? "Failed to confirm upload")
      } catch (err) {
        console.error(`[employee-doc-confirm] ${item.docType}:`, err)
        failCount++
      }
    }
    if (failCount > 0) toast.warning(`${failCount} document(s) failed to confirm in database.`)
  }

  async function handleSubmit(e: React.FormEvent, draft = false) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    try {
      // Validate phone number formatting (10 to 15 digits) if not draft
      if (!draft && phone) {
        const cleanPhone = phone.replace(/[\s\-()]/g, "")
        const phoneRegex = /^\+?[0-9]{10,15}$/
        if (!phoneRegex.test(cleanPhone)) {
          throw new Error("Invalid phone number format. It must be a 10 to 15 digit number.")
        }
      }

      // Validate emergency contact phone number formatting if provided
      if (!draft && emergency.phone) {
        const cleanEmergPhone = emergency.phone.replace(/[\s\-()]/g, "")
        const phoneRegex = /^\+?[0-9]{10,15}$/
        if (!phoneRegex.test(cleanEmergPhone)) {
          throw new Error("Invalid emergency contact phone number. It must be a 10 to 15 digit number.")
        }
      }

      const payload = {
        fullName, email,
        phone: phone || undefined, dateOfBirth: dob || undefined, gender: gender || undefined, address: address || undefined,
        reportingManagerId: reportingManagerId || undefined,
        emergencyContact: (emergency.name || emergency.phone) ? emergency : undefined,
        departmentId: departmentId || undefined, designation: designation || undefined,
        employmentType, monthlySalary: Number(monthlySalary) || 0,
        dateOfJoining: dateOfJoining || undefined, status: draft ? "draft" : status,
        skills: skills.length ? skills : undefined, qualification: qualification || undefined,
        hasAdminAccess: hasAdminAccess && !employee?.adminAccount,
        roleId: hasAdminAccess && !employee?.adminAccount ? roleId : undefined,
        profilePhotoKey: profilePhotoKey || null,
      }
      const res = await doSaveRequest(payload)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save employee")
      if (!isEdit && data.tempPassword) setTempPassword(data.tempPassword)

      const resolvedEmployeeId: string = isEdit ? employee!.id : data.employeeId
      await confirmAllDocs(resolvedEmployeeId)

      // Perform bulk deletion of removed existing documents
      if (docsToDelete.length > 0) {
        try {
          const deleteRes = await fetch("/api/admin/employees/documents/delete", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ s3Keys: docsToDelete })
          });
          if (!deleteRes.ok) throw new Error("Failed to delete removed documents");
        } catch (delErr) {
          console.error("[handleSubmit] Bulk delete error:", delErr);
        }
      }

      if (draft) { toast.success("Draft saved successfully.") }
      else {
        toast.success(isEdit ? "Employee updated." : `Employee created — code: ${data.employeeCode}`)
        setTimeout(() => router.push("/admin/employees"), 1500)
      }
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred") 
      submittingRef.current = false
    } finally { 
      setSaving(false) 
    }
  }

  async function handleGrantAdminAccess() {
    if (!roleId || !employee?.id) return; setSaving(true)
    try {
      async function send() {
        return fetch(`/api/admin/employees/${employee!.id}/admin-account`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ roleId }) })
      }
      let res = await send()
      if (res.status === 401) {
        const user = clientAuth.currentUser
        if (user) {
          const freshToken = await user.getIdToken(true)
          await fetch("/api/auth/refresh-session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: freshToken }) })
          res = await send()
        }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create admin account")
      if (data.tempPassword) setTempPassword(data.tempPassword)
      toast.success("Admin access granted."); router.refresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : "An unexpected error occurred") }
    finally { setSaving(false) }
  }

  function DatePickerField({ value, onChange, placeholder = "Pick a date" }: { value: string; onChange: (val: string) => void; placeholder?: string }) {
    const selected = value ? parseISO(value) : undefined
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={`${inputCls} flex items-center gap-2 text-left w-full ${!value ? "text-muted" : ""}`}>
            <CalendarIcon className="size-3.5 text-muted shrink-0" />
            {value ? format(selected!, "dd MMM yyyy") : placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selected} onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown" startMonth={new Date(1950, 0)} endMonth={new Date(new Date().getFullYear() + 5, 11)} />
        </PopoverContent>
      </Popover>
    )
  }

  function FileSlotField({ label, required, slot, onChange }: { label: string; required?: boolean; slot: FileSlot | undefined; onChange: (file: File | null) => void }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const uploadStatus = slot?.status
    
    const hasFile = !!slot?.file
    const hasS3Key = !!slot?.s3Key
    const isUploaded = uploadStatus === "done"

    const objUrl = hasFile ? URL.createObjectURL(slot.file!) : (slot as any)?.presignedUrl || null
    const fileName = hasFile ? slot.file!.name : (slot as any)?.fileName || "Uploaded Document"
    const isImage = hasFile ? isImageFile(slot.file!) : /\.(jpg|jpeg|png)$/i.test((slot as any)?.fileName ?? "")

    return (
      <div className="space-y-1.5">
        <label className={labelCls}>{label}{required ? " *" : <OptionalTag />}</label>
        {(hasFile || (hasS3Key && isUploaded)) ? (
          <div className="rounded-md border border-default bg-elevated overflow-hidden">
            {/* Image preview strip */}
            {isImage && objUrl && (
              <div className="relative w-full h-28 bg-black/5 overflow-hidden border-b border-default">
                <img
                  src={objUrl}
                  alt={fileName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {/* File info row */}
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText className="size-4 text-muted shrink-0" />
              <span className="flex-1 truncate text-foreground">{fileName}</span>
              {objUrl && (
                <a href={objUrl} target="_blank" rel="noreferrer" className="text-primary hover:opacity-70 transition-opacity" title="Preview">
                  <Eye className="size-4" />
                </a>
              )}
              {uploadStatus === "uploading" && <Loader2 className="size-4 animate-spin text-primary shrink-0" />}
              {uploadStatus === "done" && <CheckCircle2 className="size-4 text-green-600 shrink-0" />}
              {uploadStatus === "error" && <span className="text-xs text-red-500 shrink-0">failed</span>}
              {(!uploadStatus || uploadStatus === "error" || uploadStatus === "done") && (
                <button type="button" onClick={() => onChange(null)} className="text-muted hover:text-danger-500 transition-colors" title="Remove">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-2 rounded-md border border-dashed border-default bg-white px-3 py-2.5 text-sm text-muted hover:border-primary hover:text-primary transition-colors w-full">
            <Upload className="size-4 shrink-0" />Upload file (PDF, JPG, PNG · max 5 MB)
          </button>
        )}
        {slot?.error && <p className="text-xs text-danger-500">{slot.error}</p>}
        <input ref={inputRef} type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </div>
    )
  }

  async function handleCancel() {
    const s3KeysToDelete: string[] = []
    // Only clean up newly uploaded files (having a local File object)
    for (const slot of Object.values(mandatoryFiles)) if (slot?.s3Key && slot.file !== null) s3KeysToDelete.push(slot.s3Key)
    for (const slot of Object.values(certFiles)) if (slot?.s3Key && slot.file !== null) s3KeysToDelete.push(slot.s3Key)
    for (const doc of otherDocs) if (doc.s3Key && doc.file !== null) s3KeysToDelete.push(doc.s3Key)
    
    if (profilePhotoKey && employee?.profilePhotoKey !== profilePhotoKey) {
      s3KeysToDelete.push(profilePhotoKey)
    }
    
    if (s3KeysToDelete.length > 0) {
      toast.info("Cleaning up uploaded files...")
      setSaving(true)
      await Promise.allSettled(s3KeysToDelete.map(key => deleteSingleFile(key)))
    }
    router.back()
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, isDraftRef.current)} className="space-y-8 mx-auto">
      {/* Profile Completion Bar  do not uncomment it*/}
      {/* <div className="sticky top-4 z-30 rounded-md border border-default bg-white px-5 py-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">Profile Completion</span>
          <span className="font-bold" style={{ color: "var(--color-primary)" }}>{completionPercent}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${completionPercent}%`, background: "var(--green-700)" }} />
        </div>
      </div> */}

      {/* Personal Information */}
      <section className="rounded-md border border-default bg-white p-6 space-y-5">
        <SectionHeader icon={User} title="Personal Information" />

        {/* Profile Photo Upload */}
        <div className="flex flex-col sm:flex-row  items-center gap-5 pb-4 border-b border-default border-dashed">
          <div className="relative group">
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt="Profile Photo" className="size-24 rounded-md object-cover ring-4 ring-white shadow-md" />
            ) : (
              <div className="size-24 rounded-md bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center ring-4 ring-white shadow-md">
                {fullName ? fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() : <User className="size-8" />}
              </div>
            )}
            {photoUploading && (
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
                disabled={photoUploading}
                className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-50 cursor-pointer"
              >
                Upload Photo
              </button>
              {profilePhotoKey && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoUploading}
                  className="rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-danger-500 hover:bg-danger-50 hover:border-danger-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          <div className="sm:col-span-3">
            <label className={labelCls}>Full Name *</label>
            <input required={!isDraftRef.current} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="e.g. Jaseel Mohammed" />
          </div>
          <div className="sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between mb-1.5 gap-x-2 gap-y-1">
              <label className="block text-sm font-semibold text-foreground">Email *</label>
              {isEdit && (
                <span className="text-[11px] text-muted font-medium">
                  Email cannot be modified after employee creation.
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input required={!isDraftRef.current} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} pl-8`} placeholder="name@company.com" disabled={isEdit} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Phone<OptionalTag /></label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} pl-8`} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Gender<OptionalTag /></label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue placeholder="— Select —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem><SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Date of Birth<OptionalTag /></label>
            <DatePickerField value={dob} onChange={setDob} placeholder="Pick date of birth" />
          </div>
          <div className="sm:col-span-6">
            <label className={labelCls}>Address<OptionalTag /></label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-3 size-3.5 text-muted pointer-events-none" />
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={`${textareaCls} pl-8 resize-none`} placeholder="Street, City, State, PIN" />
            </div>
          </div>
          {/* Reporting Manager */}
          <div className="sm:col-span-6">
            <label className={labelCls}>Reporting Manager<OptionalTag /></label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input ref={managerInputRef} type="text" value={managerSearch} onChange={(e) => { setManagerSearch(e.target.value); setManagerOpen(true); if (!e.target.value) setReportingManagerId("") }} onFocus={() => setManagerOpen(true)} onBlur={() => setTimeout(() => setManagerOpen(false), 150)} className={`${inputCls} pl-8 pr-8`} placeholder={managersLoading ? "Loading employees…" : "Search by name…"} />
              {reportingManagerId && <button type="button" onClick={clearManager} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"><X className="size-3.5" /></button>}
              {managerOpen && filteredManagers.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-md border border-default bg-white shadow-md max-h-48 overflow-y-auto">
                  {filteredManagers.map((m) => (<li key={m.id}><button type="button" onMouseDown={() => selectManager(m.id, m.fullName)} className="w-full text-left px-3 py-2 text-sm hover:bg-elevated transition-colors">{m.fullName}</button></li>))}
                </ul>
              )}
            </div>
          </div>
          {/* Emergency Contact */}
          <div className="sm:col-span-6">
            <button type="button" onClick={() => setEmergencyOpen((p) => !p)} className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2 hover:text-primary transition-colors">
              {emergencyOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Emergency Contact<OptionalTag />
            </button>
            {emergencyOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md border border-default bg-elevated p-4">
                <div>
                  <label className={labelCls}>Contact Name<OptionalTag /></label>
                  <input value={emergency.name} onChange={(e) => setEmergency((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Ahmed Ali" />
                </div>
                <div>
                  <label className={labelCls}>Relationship<OptionalTag /></label>
                  <Select value={emergency.relationship} onValueChange={(v) => setEmergency((p) => ({ ...p, relationship: v }))}>
                    <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue placeholder="— Select —" /></SelectTrigger>
                    <SelectContent>{["Father", "Mother", "Spouse", "Sibling", "Friend", "Other"].map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Contact Phone<OptionalTag /></label>
                  <input type="tel" value={emergency.phone} onChange={(e) => setEmergency((p) => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+91 98765 43210" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Employment Details */}
      <section className="rounded-md border border-default bg-white p-6 space-y-5">
        <SectionHeader icon={Briefcase} title="Employment Details" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Department<OptionalTag /></label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue placeholder={deptLoading ? "Loading…" : "— None —"} /></SelectTrigger>
              <SelectContent>{departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelCls}>Designation<OptionalTag /></label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} placeholder="e.g. Senior Developer" />
          </div>
          <div>
            <label className={labelCls}>Employment Type<OptionalTag /></label>
            <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as "full_time" | "part_time" | "contractual")}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="full_time">Full Time</SelectItem><SelectItem value="part_time">Part Time</SelectItem><SelectItem value="contractual">Contractual</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelCls}>Monthly Salary (₹)<OptionalTag /></label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className={`${inputCls} pl-8`} placeholder="0" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date of Joining<OptionalTag /></label>
            <DatePickerField value={dateOfJoining} onChange={setDateOfJoining} placeholder="Pick joining date" />
          </div>
          <div>
            <label className={labelCls}>Status<OptionalTag /></label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive" | "on_notice" | "resigned")}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on_notice">On Notice</SelectItem><SelectItem value="resigned">Resigned</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="rounded-md border border-default bg-white p-6 space-y-6">
        <SectionHeader icon={FileText} title="Documents" />
        <div className="max-w-xs">
          <label className={labelCls}>Highest Qualification<OptionalTag /></label>
          <Select value={qualification} onValueChange={(v) => setQualification(v as Qualification)}>
            <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue placeholder="— Select Qualification —" /></SelectTrigger>
            <SelectContent>{QUALIFICATION_LEVELS.map((q) => (<SelectItem key={q} value={q}>{q}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        {visibleCertSlots.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Educational Certificates</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleCertSlots.map((slot) => (<FileSlotField key={slot.key} label={slot.label} slot={certFiles[slot.key]} onChange={(f) => handleCertFile(slot.key, f)} />))}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Identity &amp; Banking Documents</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MANDATORY_DOCS.map((doc) => (<FileSlotField key={doc.key} label={doc.label} required slot={mandatoryFiles[doc.key]} onChange={(f) => handleMandatoryFile(doc.key, f)} />))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Other Documents<span className="text-xs font-normal normal-case ml-1 text-muted">(optional)</span></p>
          <div className="space-y-3">
            {otherDocs.map((doc) => (
              <div key={doc.id} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-start rounded-md border border-default bg-elevated p-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Document Name</label>
                  <input value={doc.name} onChange={(e) => updateOtherDoc(doc.id, "name", e.target.value)} className={inputCls} placeholder="e.g. Experience Certificate" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">File</label>
                  {(doc.file || (doc.s3Key && doc.status === "done")) ? (
                    <div className="rounded-md border border-default bg-white overflow-hidden">
                      {/* Image preview for other docs */}
                      {(doc.file ? isImageFile(doc.file) : /\.(jpg|jpeg|png)$/i.test((doc as any).fileName ?? "")) && (
                        <div className="relative w-full h-24 bg-black/5 overflow-hidden border-b border-default">
                          <img
                            src={doc.file ? URL.createObjectURL(doc.file) : (doc as any).presignedUrl || ""}
                            alt={doc.file ? doc.file.name : (doc as any).fileName || ""}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 h-10 px-3 text-sm">
                        <FileText className="size-4 text-muted shrink-0" />
                        <span className="flex-1 truncate text-foreground">{doc.file ? doc.file.name : (doc as any).fileName || "Uploaded Document"}</span>
                        {(doc.file ? URL.createObjectURL(doc.file) : (doc as any).presignedUrl) && (
                          <a href={doc.file ? URL.createObjectURL(doc.file) : (doc as any).presignedUrl} target="_blank" rel="noreferrer" className="text-primary hover:opacity-70 transition-opacity" title="Preview">
                            <Eye className="size-4" />
                          </a>
                        )}
                        {doc.status === "uploading" && <Loader2 className="size-4 animate-spin text-primary shrink-0" />}
                        {doc.status === "done" && <CheckCircle2 className="size-4 text-green-600 shrink-0" />}
                        {doc.status === "error" && <span className="text-xs text-red-500 shrink-0">failed</span>}
                        {(!doc.status || doc.status === "error" || doc.status === "done") && (
                          <button type="button" onClick={() => updateOtherDoc(doc.id, "file", null)} className="text-muted hover:text-foreground transition-colors"><X className="size-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 h-10 rounded-md border border-dashed border-default bg-white px-3 text-sm text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer">
                      <Upload className="size-4 shrink-0" /><span>Upload file</span>
                      <input type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => updateOtherDoc(doc.id, "file", e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                  {doc.error && <p className="text-xs text-danger-500 mt-1">{doc.error}</p>}
                </div>
                <div className="flex items-end h-10">
                  <button type="button" onClick={() => removeOtherDoc(doc.id)} disabled={otherDocs.length === 1} className="h-10 w-10 flex items-center justify-center rounded-md border border-default text-muted hover:text-danger-500 hover:border-danger-500 transition-colors disabled:opacity-30" title="Remove row"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOtherDoc} className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-70 transition-opacity"><Plus className="size-4" /> Add Document</button>
        </div>
      </section>

      {/* Admin Panel Access */}
      <section className="rounded-md border border-default bg-white p-6 space-y-5">
        <SectionHeader icon={Shield} title="Admin Panel Access" />
        {employee?.adminAccount ? (
          <div className="rounded-md border px-4 py-3 flex items-center gap-3" style={{ background: "var(--success-50)", borderColor: "var(--success-100)" }}>
            <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success-600)" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--success-700)" }}>Admin access active</p>
              <p className="text-xs" style={{ color: "var(--success-600)" }}>Role: {employee.adminAccount.role} · Status: {employee.adminAccount.status}</p>
            </div>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setHasAdminAccess((p) => !p)} className={`relative h-6 w-11 rounded-full transition-colors border border-default ${hasAdminAccess ? "bg-primary" : "bg-subtle"}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hasAdminAccess ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-semibold select-none">Grant admin panel access</span>
            </label>
            {hasAdminAccess && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Role *</label>
                  <Select value={roleId} onValueChange={setRoleId}>
                    <SelectTrigger className="w-full h-10 border-default bg-white text-sm"><SelectValue placeholder="— Select Role —" /></SelectTrigger>
                    <SelectContent>{roles.filter((r) => r.name !== "super_admin").map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {isEdit && <button type="button" onClick={handleGrantAdminAccess} disabled={!roleId || saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">Grant Access</button>}
              </div>
            )}
          </>
        )}
      </section>

      {tempPassword && (
        <div className="rounded-md border px-4 py-3" style={{ background: "var(--amber-50)", borderColor: "var(--amber-200)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--amber-700)" }}>⚠ Email delivery failed — share this password manually:</p>
          <p className="font-mono text-sm font-bold tracking-widest" style={{ color: "var(--amber-700)" }}>{tempPassword}</p>
        </div>
      )}

      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-3 rounded-md border border-default bg-white/80 p-2 backdrop-blur-md shadow-sm">
        <button type="button" onClick={handleCancel} disabled={saving || isUploading} className="rounded-xl border border-default px-5 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors">Cancel</button>
        <button type="submit" disabled={saving || isUploading} onClick={() => { isDraftRef.current = true }} className="rounded-xl border border-default px-5 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-60">{saving ? "Saving…" : "Save as Draft"}</button>
        <button type="submit" disabled={saving || isUploading} onClick={() => { isDraftRef.current = false }} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity">{saving ? "Saving…" : isUploading ? "Uploading..." : isEdit ? "Save Changes" : "Create Employee"}</button>
      </div>
      {cropSrc && originalFile && (
        <ImageCropper
          src={cropSrc}
          fileName={originalFile.name}
          onCrop={handleCropSave}
          onCancel={() => {
            setCropSrc(null)
            setOriginalFile(null)
            if (photoInputRef.current) photoInputRef.current.value = ""
          }}
          circular={false}
        />
      )}
    </form>
  )
}