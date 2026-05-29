"use client"

import {
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

import { cn } from "@/lib/utils"

import type { StudentDetail } from "./types"
import { fmtDate } from "./types"
 
// ── Primitives ───────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value?: string | number | null
}) {
  const displayValue =
    value !== undefined && value !== null && value !== ""
      ? value
      : "-"

  return (
    <div className="flex items-start gap-3 py-3 border-b border-default last:border-0">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted font-medium mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {displayValue}
        </p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 pb-1", className)}>
      <CardHeader className="pb-3 border-b border-default">
        <CardTitle className="text-xs font-bold text-muted uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

type StudentInfoGridProps = {
  student: StudentDetail
  canEditStudent: boolean
  updating: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function StudentInfoGrid({
  student,
  canEditStudent,
  updating,
}: StudentInfoGridProps) {
  return (
    <>
      {/* Grid: Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-10">
        {/* Contact Info */}
        <div className="lg:col-span-2">
          <SectionCard title="Contact Information" className="h-full">
            <InfoRow
              icon={Mail}
              label="Email Address"
              value={student.email}
            />
            <InfoRow
              icon={Phone}
              label="Phone Number"
              value={student.phone || student.phone_number}
            />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={student.address}
            />
          </SectionCard>
        </div>

        {/* Personal Info */}
        <div className="lg:col-span-1">
          <SectionCard
            title="Personal Information"
            className="h-full"
          >
            <InfoRow
              icon={User}
              label="Gender"
              value={student.gender}
            />
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={
                student.date_of_birth
                  ? fmtDate(student.date_of_birth)
                  : student.dob
                    ? fmtDate(student.dob)
                    : null
              }
            />
            <InfoRow
              icon={UserCheck}
              label="Student Type"
              value={
                student.student_type
                  ? student.student_type.charAt(0).toUpperCase() +
                    student.student_type.slice(1)
                  : null
              }
            />
          </SectionCard>
        </div>

        {/* Academic Profile */}
        <div className="lg:col-span-2">
          <SectionCard title="Academic Profile" className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow
                icon={Building2}
                label="Highest Qualification"
                value={student.highest_qualification}
              />
              <InfoRow
                icon={Calendar}
                label="Year of Passing"
                value={student.year_of_passing}
              />
              <div className="sm:col-span-2">
                <InfoRow
                  icon={User}
                  label="Current Status"
                  value={
                    student.current_status
                      ? student.current_status
                          .charAt(0)
                          .toUpperCase() +
                        student.current_status
                          .slice(1)
                          .replace("_", " ")
                      : null
                  }
                />
              </div>
            </div>


          </SectionCard>
        </div>

        {/* Emergency Contact */}
        <div className="lg:col-span-1">
          <SectionCard title="Emergency Contact" className="h-full">
            <InfoRow
              icon={User}
              label="Contact Name"
              value={student.emergency_contact_name}
            />
            <InfoRow
              icon={User}
              label="Relationship"
              value={student.emergency_contact_relation}
            />
            <InfoRow
              icon={Phone}
              label="Phone Number"
              value={student.emergency_contact_phone}
            />
          </SectionCard>
        </div>
      </div>

      {/* Documents card */}
      {(student.certification_url || student.id_proof_url) && (
        <div className="mb-10">
          <SectionCard title="Uploaded Documents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {student.id_proof_url && (
                <DocumentRow
                  url={student.id_proof_url}
                  label="Government ID Proof"
                />
              )}
              {student.certification_url && (
                <DocumentRow
                  url={student.certification_url}
                  label="Qualification Certificate"
                />
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  )
}

// ── Document Row ─────────────────────────────────────────────────────────────

function DocumentRow({
  url,
  label,
}: {
  url: string
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-default bg-elevated/40 hover:bg-elevated transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
          <FileText className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {label}
          </p>
          <p className="text-xs text-muted truncate">
            Uploaded file
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-2 rounded-md bg-white border border-default hover:bg-subtle transition-colors shrink-0"
      >
        View File
      </a>
    </div>
  )
}
