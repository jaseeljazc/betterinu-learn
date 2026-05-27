"use client"

import { useState, useRef, useMemo } from "react"
import { toast } from "sonner"

import { useDepartments } from "@/lib/hooks/useDepartments"
import { useManagers } from "@/lib/hooks/useManagers"
import type { Employee } from "@/types"
import { ImageCropper } from "@/components/ui/image-cropper"
import {
  useEmployeeForm,
  useSaveEmployee,
  useGrantAdminAccess,
} from "@/lib/hooks/useEmployeeForm"

import { PersonalInfoSection } from "./personal-info-section"
import { EmploymentDetailsSection } from "./employment-details-section"
import { DocumentsSection } from "./documents-section"
import { AdminAccessSection } from "./admin-access-section"
import {
  QUALIFICATION_LEVELS,
  Qualification,
  QUAL_RANK,
  CERT_SLOTS,
  MANDATORY_DOCS,
  MAX_BYTES,
  EmergencyContact,
  OtherDoc,
  FileSlot,
} from "./types"
import { Button } from "@/components/ui/button"

type EmployeeFormProps = {
  employee?: Employee
  roles?: { id: string; name: string; label: string }[]
}

export function EmployeeForm({ employee, roles = [] }: EmployeeFormProps) {
  const isEdit = !!employee
  const isDraftRef = useRef(false)

  // Helper Hooks for upload & cancel
  const { uploadSingleFile, deleteSingleFile, handleCancel } = useEmployeeForm()

  // Personal Information States
  const [fullName, setFullName] = useState(employee?.fullName ?? "")
  const [email, setEmail] = useState(employee?.email ?? "")
  const [phone, setPhone] = useState(employee?.phone ?? "")
  const [dob, setDob] = useState(employee?.dateOfBirth?.slice(0, 10) ?? "")
  const [gender, setGender] = useState(employee?.gender ?? "")
  const [address, setAddress] = useState(employee?.address ?? "")

  const [reportingManagerId, setReportingManagerId] = useState(employee?.reportingManager?.id ?? "")
  const [managerSearch, setManagerSearch] = useState(employee?.reportingManager?.fullName ?? "")
  const [managerOpen, setManagerOpen] = useState(false)
  const managerInputRef = useRef<HTMLInputElement>(null)

  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [emergency, setEmergency] = useState<EmergencyContact>({
    name: "",
    relationship: "",
    phone: "",
  })

  // Employment Details States
  const [departmentId, setDepartmentId] = useState(employee?.department?.id ?? "")
  const [designation, setDesignation] = useState(employee?.designation ?? "")
  const [employmentType, setEmploymentType] = useState(employee?.employmentType ?? "full_time")
  const [monthlySalary, setMonthlySalary] = useState(String(employee?.monthlySalary ?? ""))
  const [dateOfJoining, setDateOfJoining] = useState(employee?.dateOfJoining?.slice(0, 10) ?? "")
  const [status, setStatus] = useState(employee?.status ?? "active")

  // Documents & Skills States
  const [skills, setSkills] = useState<string[]>(employee?.skills ?? [])

  const [qualification, setQualification] = useState<Qualification | "">(() => {
    const q = employee?.qualification as string | undefined
    if (!q) return ""
    return (
      (QUALIFICATION_LEVELS.find(
        (level) => level.toLowerCase() === q.toLowerCase()
      ) as Qualification) ?? ""
    )
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
      const others = employee.documents.filter((d) => d.docType === "other")
      if (others.length > 0) {
        return others.map(
          (doc) =>
            ({
              id: doc.id,
              name: doc.docName ?? "",
              file: null,
              s3Key: doc.s3Key,
              status: "done",
              fileName: doc.fileName,
              presignedUrl: doc.presignedUrl,
            } as any)
        )
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

  // Admin Access States
  const [hasAdminAccess, setHasAdminAccess] = useState(!!employee?.adminAccount)
  const [roleId, setRoleId] = useState("")

  const isUploading = useMemo(() => {
    const checkSlot = (s: FileSlot | undefined) => s?.status === "uploading"
    const certsUploading = Object.values(certFiles).some(checkSlot)
    const mandUploading = Object.values(mandatoryFiles).some(checkSlot)
    const othersUploading = otherDocs.some((d) => d.status === "uploading")
    return certsUploading || mandUploading || othersUploading
  }, [certFiles, mandatoryFiles, otherDocs])

  const { data: departments = [], isLoading: deptLoading } = useDepartments()
  const { managers, isLoading: managersLoading } = useManagers(employee?.id)

  // TanStack Query Mutations
  const {
    mutate: saveEmployee,
    isPending: isSavePending,
    tempPassword: saveTempPassword,
  } = useSaveEmployee({
    employee,
    mandatoryFiles,
    certFiles,
    otherDocs,
    docsToDelete,
  })

  const {
    mutate: grantAdmin,
    isPending: isGrantPending,
    tempPassword: grantTempPassword,
  } = useGrantAdminAccess(employee?.id)

  const saving = isSavePending || isGrantPending
  const tempPassword = saveTempPassword || grantTempPassword

  const filteredManagers = useMemo(() => {
    const q = managerSearch.toLowerCase()
    return managers.filter((m) => m.fullName.toLowerCase().includes(q))
  }, [managers, managerSearch])

  const visibleCertSlots = useMemo(() => {
    if (!qualification) return []
    const rank = QUAL_RANK[qualification as Qualification] ?? 0
    return CERT_SLOTS.filter((c) => rank >= QUAL_RANK[c.minQual])
  }, [qualification])

  function selectManager(id: string, name: string) {
    setReportingManagerId(id)
    setManagerSearch(name)
    setManagerOpen(false)
  }

  function clearManager() {
    setReportingManagerId("")
    setManagerSearch("")
    managerInputRef.current?.focus()
  }

  function validateFile(file: File): string | undefined {
    if (!/\.(pdf|jpg|jpeg|png)$/i.test(file.name)) {
      return "Invalid format. Accepted: PDF, JPG, PNG."
    }
    if (file.size > MAX_BYTES) return "File exceeds 5 MB limit."
    return undefined
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
      setCertFiles((prev) => ({ ...prev, [key]: { file: null } }))
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
    if (error) {
      setCertFiles((prev) => ({ ...prev, [key]: { file, error, status: "error" } }))
      return
    }
    setCertFiles((prev) => ({ ...prev, [key]: { file, status: "uploading" } }))
    const res = await uploadSingleFile(file, key)
    setCertFiles((prev) => ({
      ...prev,
      [key]: { file, ...res, status: res.error ? "error" : "done" },
    }))
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
      setMandatoryFiles((prev) => ({ ...prev, [key]: { file: null } }))
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
    if (error) {
      setMandatoryFiles((prev) => ({ ...prev, [key]: { file, error, status: "error" } }))
      return
    }
    setMandatoryFiles((prev) => ({ ...prev, [key]: { file, status: "uploading" } }))
    const res = await uploadSingleFile(file, key)
    setMandatoryFiles((prev) => ({
      ...prev,
      [key]: { file, ...res, status: res.error ? "error" : "done" },
    }))
  }

  function addOtherDoc() {
    setOtherDocs((prev) => [...prev, { id: crypto.randomUUID(), name: "", file: null }])
  }

  async function removeOtherDoc(id: string) {
    const existing = otherDocs.find((d) => d.id === id)
    if (existing?.s3Key) {
      if (existing.file === null) {
        setDocsToDelete((prev) => [...prev, existing.s3Key!])
      } else {
        await deleteSingleFile(existing.s3Key)
      }
    }
    setOtherDocs((prev) => prev.filter((d) => d.id !== id))
  }

  async function updateOtherDoc(
    id: string,
    field: "name" | "file",
    value: string | File | null
  ) {
    if (field === "file") {
      const existing = otherDocs.find((d) => d.id === id)
      if (existing?.s3Key) {
        if (existing.file === null) {
          setDocsToDelete((prev) => [...prev, existing.s3Key!])
        } else {
          await deleteSingleFile(existing.s3Key)
        }
      }
      if (value instanceof File) {
        const error = validateFile(value)
        if (error) {
          setOtherDocs((prev) =>
            prev.map((d) => (d.id === id ? { ...d, file: value, error, status: "error" } : d))
          )
          return
        }
        setOtherDocs((prev) =>
          prev.map((d) => (d.id === id ? { ...d, file: value, status: "uploading" } : d))
        )
        const res = await uploadSingleFile(value, "other")
        setOtherDocs((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, file: value, ...res, status: res.error ? "error" : "done" } : d
          )
        )
        return
      }
      setOtherDocs((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, file: null, error: undefined, status: "idle", s3Key: undefined } : d
        )
      )
      return
    }
    setOtherDocs((prev) => prev.map((d) => (d.id === id ? { ...d, name: value as string } : d)))
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

  async function handleSubmit(e: React.FormEvent, draft = false) {
    e.preventDefault()
    isDraftRef.current = false

    // Validate phone number formatting (10 to 15 digits) if not draft
    if (!draft && phone) {
      const cleanPhone = phone.replace(/[\s\-()]/g, "")
      const phoneRegex = /^\+?[0-9]{10,15}$/
      if (!phoneRegex.test(cleanPhone)) {
        toast.error("Invalid phone number format. It must be a 10 to 15 digit number.")
        return
      }
    }

    // Validate emergency contact phone number formatting if provided
    if (!draft && emergency.phone) {
      const cleanEmergPhone = emergency.phone.replace(/[\s\-()]/g, "")
      const phoneRegex = /^\+?[0-9]{10,15}$/
      if (!phoneRegex.test(cleanEmergPhone)) {
        toast.error(
          "Invalid emergency contact phone number. It must be a 10 to 15 digit number."
        )
        return
      }
    }

    const payload = {
      fullName,
      email,
      phone: phone || undefined,
      dateOfBirth: dob || undefined,
      gender: gender || undefined,
      address: address || undefined,
      reportingManagerId: reportingManagerId || undefined,
      emergencyContact: emergency.name || emergency.phone ? emergency : undefined,
      departmentId: departmentId || undefined,
      designation: designation || undefined,
      employmentType,
      monthlySalary: Number(monthlySalary) || 0,
      dateOfJoining: dateOfJoining || undefined,
      status: draft ? "draft" : status,
      skills: skills.length ? skills : undefined,
      qualification: qualification || undefined,
      hasAdminAccess: hasAdminAccess && !employee?.adminAccount,
      roleId: hasAdminAccess && !employee?.adminAccount ? roleId : undefined,
      profilePhotoKey: profilePhotoKey || null,
    }

    saveEmployee({ payload, isEdit })
  }

  async function handleGrantAdminAccess() {
    if (!roleId || !employee?.id) return
    grantAdmin(roleId)
  }

  async function onCancel() {
    const uploadedKeys: string[] = []
    for (const slot of Object.values(mandatoryFiles)) {
      if (slot?.s3Key && slot.file !== null) uploadedKeys.push(slot.s3Key)
    }
    for (const slot of Object.values(certFiles)) {
      if (slot?.s3Key && slot.file !== null) uploadedKeys.push(slot.s3Key)
    }
    for (const doc of otherDocs) {
      if (doc.s3Key && doc.file !== null) uploadedKeys.push(doc.s3Key)
    }

    await handleCancel(uploadedKeys, profilePhotoKey, employee?.profilePhotoKey)
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, isDraftRef.current)} className="space-y-8 mx-auto">
      {/* Personal Information */}
      <PersonalInfoSection
        fullName={fullName}
        setFullName={setFullName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        gender={gender}
        setGender={setGender}
        dob={dob}
        setDob={setDob}
        address={address}
        setAddress={setAddress}
        isEdit={isEdit}
        isDraft={isDraftRef.current}
        
        // Profile Photo
        profilePhotoUrl={profilePhotoUrl}
        profilePhotoKey={profilePhotoKey}
        photoUploading={photoUploading}
        photoInputRef={photoInputRef}
        handlePhotoChange={handlePhotoChange}
        handleRemovePhoto={handleRemovePhoto}

        // Reporting Manager
        reportingManagerId={reportingManagerId}
        setReportingManagerId={setReportingManagerId}
        managerSearch={managerSearch}
        setManagerSearch={setManagerSearch}
        managerOpen={managerOpen}
        setManagerOpen={setManagerOpen}
        managerInputRef={managerInputRef}
        filteredManagers={filteredManagers}
        managersLoading={managersLoading}
        selectManager={selectManager}
        clearManager={clearManager}

        // Emergency Contact
        emergencyOpen={emergencyOpen}
        setEmergencyOpen={setEmergencyOpen}
        emergency={emergency}
        setEmergency={setEmergency}
      />

      {/* Employment Details */}
      <EmploymentDetailsSection
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        designation={designation}
        setDesignation={setDesignation}
        employmentType={employmentType}
        setEmploymentType={setEmploymentType}
        monthlySalary={monthlySalary}
        setMonthlySalary={setMonthlySalary}
        dateOfJoining={dateOfJoining}
        setDateOfJoining={setDateOfJoining}
        status={status}
        setStatus={setStatus}
        departments={departments}
        deptLoading={deptLoading}
      />

      {/* Documents */}
      <DocumentsSection
        qualification={qualification}
        setQualification={setQualification}
        visibleCertSlots={visibleCertSlots}
        certFiles={certFiles}
        handleCertFile={handleCertFile}
        mandatoryFiles={mandatoryFiles}
        handleMandatoryFile={handleMandatoryFile}
        otherDocs={otherDocs}
        updateOtherDoc={updateOtherDoc}
        removeOtherDoc={removeOtherDoc}
        addOtherDoc={addOtherDoc}
      />

      {/* Admin Panel Access */}
      <AdminAccessSection
        employee={employee}
        hasAdminAccess={hasAdminAccess}
        setHasAdminAccess={setHasAdminAccess}
        roleId={roleId}
        setRoleId={setRoleId}
        roles={roles}
        isEdit={isEdit}
        saving={saving}
        handleGrantAdminAccess={handleGrantAdminAccess}
      />

      {tempPassword && (
        <div
          className="rounded-md border px-4 py-3"
          style={{ background: "var(--amber-50)", borderColor: "var(--amber-200)" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--amber-700)" }}>
            ⚠ Email delivery failed — share this password manually:
          </p>
          <p className="font-mono text-sm font-bold tracking-widest" style={{ color: "var(--amber-700)" }}>
            {tempPassword}
          </p>
        </div>
      )}

  <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-3 rounded-md border border-default bg-white/80 p-2 backdrop-blur-md shadow-sm">
  <Button
    type="button"
    variant="outline"
    onClick={onCancel}
    disabled={saving || isUploading}
  >
    Cancel
  </Button>
  <Button
    type="submit"
    variant="outline"
    disabled={saving || isUploading}
    onClick={() => { isDraftRef.current = true }}
  >
    {saving && isDraftRef.current ? "Saving…" : "Save as Draft"}
  </Button>
  <Button
    type="submit"
    disabled={saving || isUploading}
  >
    {saving && !isDraftRef.current ? "Saving…" : isUploading ? "Uploading..." : isEdit ? "Save Changes" : "Create Employee"}
  </Button>
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
