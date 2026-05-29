"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, User, FileText, CheckCircle2, Clock, AlertTriangle, ShieldAlert
} from "lucide-react"
import RoboLoader from "@/components/loading/robo-loader"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar as UIDAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const STATUS_CFG = {
  active: { label: "Active", cls: "bg-green-50 text-green-700 border-green-200" },
  inactive: { label: "Inactive", cls: "bg-red-50 text-red-700 border-red-200" },
  pending: { label: "Pending", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
} as const



const STUDENT_TYPE_CFG = {
  online: { label: "Online Student" },
  offline: { label: "Offline Student" },
} as const

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
  return (
    <UIDAvatar className="size-24 ring-4 ring-white shadow-md">
      {url && <AvatarImage src={url} alt={name} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl">
        {initials}
      </AvatarFallback>
    </UIDAvatar>
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

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b border-default">
        <CardTitle className="text-xs font-bold text-muted uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  )
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/student/profile", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile")
        return res.json()
      })
      .then((data) => {
        setStudent(data)
      })
      .catch((err) => {
        setError(err.message || "An error occurred")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <RoboLoader size="md" caption="Loading your profile..." />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-default bg-white py-20 text-center shadow-sm">
          <ShieldAlert className="size-10 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Failed to load profile</h3>
          <p className="text-sm text-muted mt-2">{error || "Please sign in again."}</p>
          <Link href="/" className="mt-6 text-sm font-bold text-primary hover:underline">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CFG[student.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.active
  const typeCfg = STUDENT_TYPE_CFG[student.student_type as keyof typeof STUDENT_TYPE_CFG] ?? { label: "Student" }


  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined

  const renderDocRow = (url: string, label: string) => (
    <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-default bg-elevated/40 hover:bg-elevated transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded-md bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
          <FileText className="size-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{label}</p>
          <p className="text-xs text-muted truncate">Uploaded Attachment</p>
        </div>
      </div>
      <a href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-2 rounded-md bg-white border border-default hover:bg-subtle transition-colors shrink-0"
      >
        View File
      </a>
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-subtle px-4 sm:px-6 lg:px-10 py-10 mt-16">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-6 transition-colors font-medium">
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-5">
            <Avatar url={student.profile_image_url} name={student.name} />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {student.name}
                </h1>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-sm text-secondary mt-1">{student.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] font-mono bg-subtle border border-default text-muted px-2 py-0.5 rounded-md">
                  ID: {student.student_code || student.id.slice(0, 8)}
                </span>
                <span className="text-[11px] font-semibold border border-default text-secondary px-2 py-0.5 rounded-md">
                  {typeCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <SectionCard title="Contact Information" className="h-full">
              <InfoRow icon={Mail} label="Email Address" value={student.email} />
              <InfoRow icon={Phone} label="Phone Number" value={student.phone} />
              <InfoRow icon={MapPin} label="Address" value={student.address} />
            </SectionCard>
          </div>

          {/* Personal Info */}
          <div className="lg:col-span-1">
            <SectionCard title="Personal Information" className="h-full">
              <InfoRow icon={User} label="Gender" value={student.gender} />
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(student.date_of_birth)} />
            </SectionCard>
          </div>

          {/* Academic Info */}
          <div className="lg:col-span-2">
            <SectionCard title="Academic Profile" className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InfoRow icon={User} label="Highest Qualification" value={student.highest_qualification} />
                <InfoRow icon={Calendar} label="Year of Passing" value={student.year_of_passing} />
                <div className="sm:col-span-2">
                  <InfoRow icon={User} label="Current Status" value={student.current_status ? (student.current_status.charAt(0).toUpperCase() + student.current_status.slice(1).replace("_", " ")) : null} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Emergency Contact */}
          <div className="lg:col-span-1 flex flex-col gap-6 h-full">
            <SectionCard title="Emergency Contact" className="flex-1">
              <InfoRow icon={User} label="Contact Name" value={student.emergency_contact_name} />
              <InfoRow icon={User} label="Relationship" value={student.emergency_contact_relation} />
              <InfoRow icon={Phone} label="Phone Number" value={student.emergency_contact_phone} />
            </SectionCard>
          </div>
        </div>

        {/* Documents Section */}
        {(student.certification_url || student.id_proof_url) && (
          <div className="mt-6">
            <SectionCard title="Uploaded Documents">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {student.id_proof_url && renderDocRow(student.id_proof_url, "Government ID Proof")}
                {student.certification_url && renderDocRow(student.certification_url, "Qualification Certificate")}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}
