"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import RoboLoader from "@/components/loading/robo-loader"

import { useUpdateStudent } from "@/lib/hooks/useStudentDetail"

import type { StudentDetail } from "./types"
import { GENDER_OPTIONS } from "./types"

type EditStudentModalProps = {
  open: boolean
  onClose: () => void
  student: StudentDetail
}

export function EditStudentModal({
  open,
  onClose,
  student,
}: EditStudentModalProps) {
  const updateMutation = useUpdateStudent(student.id)

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editGender, setEditGender] = useState("")
  const [editDob, setEditDob] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editStudentCode, setEditStudentCode] = useState("")
  const [editEnrollmentDate, setEditEnrollmentDate] = useState("")
  const [editStatus, setEditStatus] = useState<
    "active" | "inactive" | "pending"
  >("active")
  const [editStudentType, setEditStudentType] = useState<
    "online" | "offline" | ""
  >("")
  const [editProfileImageUrl, setEditProfileImageUrl] =
    useState("")
  const [editEcName, setEditEcName] = useState("")
  const [editEcRelation, setEditEcRelation] = useState("")
  const [editEcPhone, setEditEcPhone] = useState("")
  const [editHighestQualification, setEditHighestQualification] =
    useState("")
  const [editCurrentStatus, setEditCurrentStatus] = useState("")
  const [editYearOfPassing, setEditYearOfPassing] = useState("")
  const [editCertificationUrl, setEditCertificationUrl] =
    useState("")
  const [editIdProofUrl, setEditIdProofUrl] = useState("")


  // Seed form values when student changes or modal opens
  useEffect(() => {
    if (!open || !student) return
    setEditName(student.name || "")
    setEditEmail(student.email || "")
    setEditPhone(student.phone || student.phone_number || "")
    setEditGender(student.gender || "")
    setEditDob(
      student.date_of_birth
        ? student.date_of_birth.split("T")[0]
        : student.dob
          ? student.dob.split("T")[0]
          : ""
    )
    setEditAddress(student.address || "")
    setEditStudentCode(student.student_code || "")
    setEditEnrollmentDate(
      student.enrollment_date
        ? student.enrollment_date.split("T")[0]
        : student.created_at
          ? student.created_at.split("T")[0]
          : ""
    )
    setEditStatus(student.status || "active")
    setEditStudentType(student.student_type || "")
    setEditProfileImageUrl(student.profile_image_url || "")
    setEditEcName(student.emergency_contact_name || "")
    setEditEcRelation(student.emergency_contact_relation || "")
    setEditEcPhone(student.emergency_contact_phone || "")
    setEditHighestQualification(
      student.highest_qualification || ""
    )
    setEditCurrentStatus(student.current_status || "")
    setEditYearOfPassing(
      student.year_of_passing
        ? String(student.year_of_passing)
        : ""
    )
    setEditCertificationUrl(student.certification_url || "")
    setEditIdProofUrl(student.id_proof_url || "")

  }, [open, student])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate(
      {
        name: editName,
        email: editEmail,
        phone: editPhone || null,
        gender: editGender || null,
        date_of_birth: editDob || null,
        address: editAddress || null,
        student_code: editStudentCode,
        enrollment_date: editEnrollmentDate || null,
        status: editStatus,
        student_type: editStudentType || null,
        profile_image_url: editProfileImageUrl || null,
        emergency_contact_name: editEcName || null,
        emergency_contact_relation: editEcRelation || null,
        emergency_contact_phone: editEcPhone || null,
        highest_qualification:
          editHighestQualification || null,
        current_status: editCurrentStatus || null,
        year_of_passing: editYearOfPassing
          ? Number(editYearOfPassing)
          : null,
        certification_url: editCertificationUrl || null,
        id_proof_url: editIdProofUrl || null,

      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <Dialog
      open={open}
      title="Edit Student Details"
      onClose={onClose}
      size="2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 pt-2 pb-4 max-h-[80vh] overflow-y-auto px-1"
      >
        {/* 1. Core Profile Details */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            Personal &amp; Contact Info
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Student Status
              </label>
              <Select
                value={editStatus}
                onValueChange={(val: any) => setEditStatus(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Student Code
              </label>
              <input
                type="text"
                required
                value={editStudentCode}
                onChange={(e) =>
                  setEditStudentCode(
                    e.target.value.toUpperCase()
                  )
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Student Type
              </label>
              <Select
                value={editStudentType}
                onValueChange={(val: any) =>
                  setEditStudentType(val)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">
                    Offline
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Gender
              </label>
              <Select
                value={editGender}
                onValueChange={setEditGender}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Enrollment Date
              </label>
              <input
                type="date"
                value={editEnrollmentDate}
                onChange={(e) =>
                  setEditEnrollmentDate(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Profile Photo URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={editProfileImageUrl}
                onChange={(e) =>
                  setEditProfileImageUrl(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Address
            </label>
            <textarea
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 2. Emergency Contact Details */}
        <div className="space-y-3 pt-2 border-t border-default">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            Emergency Contact
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={editEcName}
                onChange={(e) => setEditEcName(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Relationship
              </label>
              <input
                type="text"
                placeholder="e.g. Parent, Sibling"
                value={editEcRelation}
                onChange={(e) =>
                  setEditEcRelation(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={editEcPhone}
                onChange={(e) => setEditEcPhone(e.target.value)}
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Academic Profile details */}
        <div className="space-y-3 pt-2 border-t border-default">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">
            Academic Background &amp; Verification
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Highest Qualification
              </label>
              <input
                type="text"
                placeholder="e.g. UG, Plus Two"
                value={editHighestQualification}
                onChange={(e) =>
                  setEditHighestQualification(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Year of Passing
              </label>
              <input
                type="number"
                placeholder="e.g. 2022"
                value={editYearOfPassing}
                onChange={(e) =>
                  setEditYearOfPassing(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Current Status
              </label>
              <Select
                value={editCurrentStatus}
                onValueChange={setEditCurrentStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studying">
                    Studying
                  </SelectItem>
                  <SelectItem value="employed">
                    Employed
                  </SelectItem>
                  <SelectItem value="self_employed">
                    Self Employed
                  </SelectItem>
                  <SelectItem value="unemployed">
                    Unemployed
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>



            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                ID Proof Doc URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={editIdProofUrl}
                onChange={(e) =>
                  setEditIdProofUrl(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Qualification Cert URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={editCertificationUrl}
                onChange={(e) =>
                  setEditCertificationUrl(e.target.value)
                }
                className="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {updateMutation.isError && (
          <p className="text-sm font-semibold text-red-500 bg-red-50 p-2 rounded-md border border-red-100">
            {updateMutation.error?.message ||
              "An error occurred"}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-default">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-md border border-default px-4 py-2 text-sm font-semibold text-secondary hover:bg-subtle cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <RoboLoader size="xs" className="text-current" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
