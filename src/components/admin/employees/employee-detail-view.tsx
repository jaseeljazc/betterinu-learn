"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Pencil, X, Mail, Phone, MapPin, Briefcase,
  Calendar, DollarSign, Building2, User, Shield, CheckCircle2,
  Clock, UserCheck, FileText, CalendarDays,
} from "lucide-react"
import { EmployeeForm } from "@/components/admin/employees/employee-form"
import { EmployeeAttendanceMini } from "@/components/admin/profile/employee-attendance-mini"
import { Dialog } from "@/components/ui/dialog"
import type { Employee } from "@/types"

const STATUS_CFG = {
  active: { label: "Active", cls: "bg-green-50 text-green-700 border-green-200" },
  inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  on_notice: { label: "On Notice", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  resigned: { label: "Resigned", cls: "bg-red-50 text-red-600 border-red-200" },
} as const

const EMP_TYPE_CFG = {
  full_time: { label: "Full Time" },
  part_time: { label: "Part Time" },
  contractual: { label: "Contractual" },
} as const

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
  if (url) {
    return (
      <img src={url} alt={name} className="size-24 rounded-md object-cover ring-4 ring-white shadow-md" />
    )
  }
  return (
    <div className="size-24 rounded-md bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center ring-4 ring-white shadow-md">
      {initials}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  const displayValue = value !== undefined && value !== null && value !== "" ? value : "-"

  return (
    <div className="flex items-start gap-3 py-3 border-b border-default last:border-0">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground">{displayValue}</p>
      </div>
    </div>
  )
}

function InfoCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  const displayValue = value !== undefined && value !== null && value !== "" ? value : "-"

  return (
    <div className="flex items-start gap-3 py-3 border-b border-default ">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground">{displayValue}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-default bg-white p-5 ${className ?? ""}`}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

type Props = {
  employee: Employee
  canEdit: boolean
  roles: { id: string; name: string; label: string }[]
}

export function EmployeeDetailView({ employee, canEdit, roles }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)

  const statusCfg = STATUS_CFG[employee.status] ?? STATUS_CFG.active
  const typeCfg = EMP_TYPE_CFG[employee.employmentType] ?? EMP_TYPE_CFG.full_time

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined
  const formatSalary = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : undefined

  const getDocLabel = (type: string) => {
    switch (type) {
      case "aadhaar": return "Aadhaar Card"
      case "pan": return "PAN Card"
      case "passbook": return "Bank Passbook"
      case "sslc": return "SSLC Certificate"
      case "plusTwo": return "Plus Two Certificate"
      case "degree": return "Degree Certificate"
      case "pg": return "PG Certificate"
      default: return "Document"
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const renderDocRow = (d: any) => (
    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-default bg-elevated/40 hover:bg-elevated transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
          <FileText className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {d.docType === "other" ? (d.docName || "Other Document") : getDocLabel(d.docType)}
          </p>
          <p className="text-xs text-muted truncate">
            {d.fileName} · {formatBytes(d.fileSize)}
          </p>
        </div>
      </div>
      {d.presignedUrl && (
        <a href={d.presignedUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-2 rounded-md bg-white border border-default hover:bg-subtle transition-colors shrink-0"
        >
          View File
        </a>
      )}
    </div>
  )

  const docs = employee.documents ?? []
  const mandatoryDocs = docs.filter(d => ["aadhaar", "pan", "passbook"].includes(d.docType))
  const certDocs = docs.filter(d => ["sslc", "plusTwo", "degree", "pg"].includes(d.docType))
  const otherDocs = docs.filter(d => d.docType === "other")

  return (
    <div className="w-full min-h-screen bg-subtle px-4 sm:px-6 lg:px-10 py-10">
      <Link href="/admin/employees" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="size-4" /> Back to Employees
      </Link>

      {editing ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Edit Employee</h1>
              <p className="text-sm text-secondary mt-1">{employee.fullName} · {employee.employeeCode}</p>
            </div>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-2 rounded-md border border-default bg-white px-4 py-2 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
            >
              <X className="size-4" /> Cancel Edit
            </button>
          </div>
          <EmployeeForm employee={employee} roles={roles} />
        </div>
      ) : (
        <div>
          {/* Page header */}
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-5">
              <Avatar url={employee.profilePhotoUrl} name={employee.fullName} />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    {employee.fullName}
                  </h1>
                  <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-secondary mt-1">{employee.designation ?? "Employee"}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] font-mono bg-subtle border border-default text-muted px-2 py-0.5 rounded-md">
                    {employee.employeeCode}
                  </span>
                  <span className="text-[11px] font-semibold border border-default text-secondary px-2 py-0.5 rounded-md">
                    {typeCfg.label}
                  </span>
                  {employee.department && (
                    <span className="text-[11px] font-semibold border border-default text-secondary px-2 py-0.5 rounded-md">
                      {employee.department.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAttendanceOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-default bg-white px-5 py-2.5 text-sm font-bold text-secondary hover:bg-subtle transition-colors "
              >
                <CalendarDays className="size-4" /> View Attendance
              </button>
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Pencil className="size-4" /> Edit Employee
                </button>
              )}
            </div>
          </div>

          {/* Unified Flattened Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Row 1 Left: Contact Info */}
            <div className="lg:col-span-2">
              <SectionCard title="Contact Information" className="h-full">
                <InfoRow icon={Mail} label="Email Address" value={employee.email} />
                <InfoRow icon={Phone} label="Phone Number" value={employee.phone} />
                <InfoRow icon={MapPin} label="Address" value={employee.address} />
              </SectionCard>
            </div>

            {/* Row 1 Right: Personal Info */}
            <div className="lg:col-span-1">
              <SectionCard title="Personal Information" className="h-full">
                <InfoRow icon={User} label="Gender" value={employee.gender} />
                <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                <InfoRow icon={Building2} label="Highest Qualification" value={employee.qualification} />


              </SectionCard>
            </div>

            {/* Row 2 Left: Employment Details */}
            <div className="lg:col-span-2">
              <SectionCard title="Employment Details" className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <InfoCell icon={Building2} label="Department" value={employee.department?.name} />
                  <InfoCell icon={Briefcase} label="Designation" value={employee.designation} />
                  <InfoCell icon={UserCheck} label="Employment Type" value={typeCfg.label} />
                  <InfoCell icon={DollarSign} label="Monthly Salary" value={formatSalary(employee.monthlySalary)} />
                  <InfoCell icon={Calendar} label="Date of Joining" value={formatDate(employee.dateOfJoining)} />
                  <InfoCell icon={User} label="Reporting Manager" value={employee.reportingManager?.fullName} />
                </div>
              </SectionCard>
            </div>

            {/* Row 2 Right: Admin Access & Record Info stacked */}
            <div className="lg:col-span-1 flex flex-col gap-6 h-full">
              <SectionCard title="Admin Access">
                {employee.adminAccount ? (
                  <div className="rounded-md border px-4 py-3 flex items-center gap-3" style={{ background: "var(--success-50)", borderColor: "var(--success-100)" }}>
                    <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success-600)" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--success-700)" }}>Admin access active</p>
                      <p className="text-xs" style={{ color: "var(--success-600)" }}>Role: {employee.adminAccount.role} · Status: {employee.adminAccount.status}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <Shield className="size-4 text-muted" />
                    <p className="text-sm text-muted">No admin access</p>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Record Info" className="flex-1">
                <InfoRow icon={Clock} label="Created At" value={formatDate(employee.createdAt)} />
              </SectionCard>
            </div>
          </div>

          {/* Documents */}
          <div className="mt-6">
            <SectionCard title="Documents">
              {docs.length === 0 ? (
                <p className="text-sm text-muted py-2">No documents uploaded.</p>
              ) : (
                <div className="space-y-5 pt-1">
                  {mandatoryDocs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Identity & Banking</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mandatoryDocs.map(renderDocRow)}
                      </div>
                    </div>
                  )}
                  {certDocs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Educational Certificates</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {certDocs.map(renderDocRow)}
                      </div>
                    </div>
                  )}
                  {otherDocs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Other Attachments</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {otherDocs.map(renderDocRow)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          <Dialog
            open={attendanceOpen}
            title={`${employee.fullName}'s Attendance`}
            onClose={() => setAttendanceOpen(false)}
            size="sm"
          >
            <div className="py-2">
              <EmployeeAttendanceMini employeeId={employee.id} />
            </div>
          </Dialog>
        </div>
      )}
    </div>
  )
}