"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  User, Mail, Phone, MapPin,
  Briefcase, DollarSign, Shield, AlertCircle, CheckCircle2,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { clientAuth } from "@/lib/firebase-client"
import type { Employee, Department } from "@/types"


import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type EmployeeFormProps = {
  /** Provide when editing an existing employee */
  employee?: Employee
  /** Roles available for admin account assignment */
  roles?: { id: string; name: string; label: string }[]
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function EmployeeForm({ employee, roles = [] }: EmployeeFormProps) {
  const router = useRouter()
  const isEdit = !!employee

  // Personal details
  const [fullName, setFullName]   = useState(employee?.fullName ?? "")
  const [email, setEmail]         = useState(employee?.email ?? "")
  const [phone, setPhone]         = useState(employee?.phone ?? "")
  const [dob, setDob]             = useState(employee?.dateOfBirth?.slice(0, 10) ?? "")
  const [gender, setGender]       = useState(employee?.gender ?? "")
  const [address, setAddress]     = useState(employee?.address ?? "")

  // Employment details
  const [departmentId, setDepartmentId]         = useState(employee?.department?.id ?? "")
  const [designation, setDesignation]           = useState(employee?.designation ?? "")
  const [employmentType, setEmploymentType]     = useState(employee?.employmentType ?? "full_time")
  const [reportingManagerId, setReportingManagerId] = useState(employee?.reportingManager?.id ?? "")
  const [monthlySalary, setMonthlySalary]       = useState(String(employee?.monthlySalary ?? ""))
  const [dateOfJoining, setDateOfJoining]       = useState(employee?.dateOfJoining?.slice(0, 10) ?? "")
  const [status, setStatus]                     = useState(employee?.status ?? "active")

  // Admin access
  const [hasAdminAccess, setHasAdminAccess] = useState(!!employee?.adminAccount)
  const [roleId, setRoleId]                 = useState("")

  // Supporting data
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers]       = useState<{ id: string; fullName: string }[]>([])

  // State
  const [saving, setSaving]   = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/employees/departments", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/employees", { credentials: "include" }).then((r) => r.json()),
    ]).then(([deptData, empData]) => {
      setDepartments(deptData.departments ?? [])
      setManagers(
        (empData.employees ?? [])
          .filter((e: Employee) => !isEdit || e.id !== employee?.id)
          .map((e: Employee) => ({ id: e.id, fullName: e.fullName }))
      )
    })
  }, [isEdit, employee?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        fullName, email, phone: phone || undefined,
        dateOfBirth: dob || undefined, gender: gender || undefined, address: address || undefined,
        departmentId: departmentId || undefined, designation: designation || undefined,
        employmentType, reportingManagerId: reportingManagerId || undefined,
        monthlySalary: Number(monthlySalary) || 0,
        dateOfJoining: dateOfJoining || undefined, status,
        hasAdminAccess: hasAdminAccess && !employee?.adminAccount,
        roleId: hasAdminAccess && !employee?.adminAccount ? roleId : undefined,
      }

      const url    = isEdit ? `/api/admin/employees/${employee!.id}` : "/api/admin/employees"
      const method = isEdit ? "PATCH" : "POST"

      async function doSave() {
        return fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
      }

      let res = await doSave()

      if (res.status === 401) {
        const user = clientAuth.currentUser
        if (user) {
          const freshToken = await user.getIdToken(true) // force refresh
          await fetch("/api/auth/refresh-session", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken }),
          })
          res = await doSave()
        }
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save employee")

      if (!isEdit && data.tempPassword) setTempPassword(data.tempPassword)
      toast.success(isEdit ? "Employee updated successfully." : `Employee created — code: ${data.employeeCode}`)

      if (!isEdit) {
        setTimeout(() => router.push(`/admin/employees/${data.employeeId}`), 1500)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleGrantAdminAccess() {
    if (!roleId || !employee?.id) return
    setSaving(true)
    try {
      async function doSave() {
        return fetch(`/api/admin/employees/${employee!.id}/admin-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ roleId }),
        })
      }

      let res = await doSave()

      if (res.status === 401) {
        const user = clientAuth.currentUser
        if (user) {
          const freshToken = await user.getIdToken(true) // force refresh
          await fetch("/api/auth/refresh-session", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken }),
          })
          res = await doSave()
        }
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create admin account")
      if (data.tempPassword) setTempPassword(data.tempPassword)
      toast.success("Admin access granted successfully.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }


  /* ---- Shared field class ---- */
  const inputCls    = "w-full h-10 rounded-lg border border-default bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
  const textareaCls = "w-full rounded-lg border border-default bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
  const labelCls    = "block text-sm font-semibold text-foreground mb-1.5"


  function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const selected = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${inputCls} flex items-center gap-2 text-left w-full ${!value ? "text-muted" : ""}`}
        >
          <CalendarIcon className="size-3.5 text-muted shrink-0" />
          {value ? format(selected!, "dd MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          captionLayout="dropdown"
          startMonth={new Date(1950, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}

  return (
    <form onSubmit={handleSubmit} className="space-y-8 mx-auto">      {/* ── Personal Information ─────────────────────────────── */}
      <section className="rounded-2xl border border-default bg-white p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-default">
          <User className="size-4 text-primary" />
          <h3 className="font-bold text-base">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-5">
          <div className="sm:col-span-3">
            <label className={labelCls}>Full Name *</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="e.g. Jaseel Mohammed" />
          </div>

          <div className="sm:col-span-3">
            <label className={labelCls}>Email *</label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} pl-8`} placeholder="name@company.com" disabled={isEdit} />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} pl-8`} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Gender</label>
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

        <div className="sm:col-span-2">
  <label className={labelCls}>Date of Birth</label>
  <DatePickerField value={dob} onChange={setDob} placeholder="Pick date of birth" />
</div>

          <div className="sm:col-span-6">
            <label className={labelCls}>Address</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-3 size-3.5 text-muted pointer-events-none" />
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={`${textareaCls} pl-8 resize-none`} placeholder="Street, City, State, PIN" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Employment Details ────────────────────────────────── */}
      <section className="rounded-2xl border border-default bg-white p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-default">
          <Briefcase className="size-4 text-primary" />
          <h3 className="font-bold text-base">Employment Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={labelCls}>Department</label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— None —" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelCls}>Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className={inputCls} placeholder="e.g. Senior Developer" />
          </div>

          <div>
            <label className={labelCls}>Employment Type</label>
            <Select
              value={employmentType}
              onValueChange={(v) => setEmploymentType(v as "full_time" | "part_time" | "contractual")}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contractual">Contractual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelCls}>Monthly Salary (₹)</label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
              <input type="number" min="0" step="1" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} className={`${inputCls} pl-8`} placeholder="0" />
            </div>
          </div>

         <div>
  <label className={labelCls}>Date of Joining</label>
  <DatePickerField value={dateOfJoining} onChange={setDateOfJoining} placeholder="Pick joining date" />
</div>

          <div>
            <label className={labelCls}>Status</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "inactive" | "on_notice" | "resigned")}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_notice">On Notice</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* ── Admin Access ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-default bg-white p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-default">
          <Shield className="size-4 text-primary" />
          <h3 className="font-bold text-base">Admin Panel Access</h3>
        </div>

        {employee?.adminAccount ? (
          /* Existing admin account — read-only */
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="size-4 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Admin access active</p>
              <p className="text-xs text-green-700">Role: {employee.adminAccount.role} · Status: {employee.adminAccount.status}</p>
            </div>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setHasAdminAccess((p) => !p)}
                className={`relative h-6 w-11 rounded-full transition-colors ${hasAdminAccess ? "bg-primary" : "bg-subtle"} border border-default`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hasAdminAccess ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-semibold select-none">Grant admin panel access</span>
            </label>

            {hasAdminAccess && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Role *</label>
                  <Select value={roleId} onValueChange={setRoleId}>
                    <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                      <SelectValue placeholder="— Select Role —" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((r) => r.name !== "super_admin")
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {isEdit && (
                  <button
                    type="button"
                    onClick={handleGrantAdminAccess}
                    disabled={!roleId || saving}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Grant Access
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Messages ─────────────────────────────────────────── */}
      {tempPassword && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-800 mb-1">⚠ Email delivery failed — share this password manually:</p>
          <p className="font-mono text-sm font-bold text-yellow-900 tracking-widest">{tempPassword}</p>
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-default px-5 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Employee"}
        </button>
      </div>
    </form>
  )
}
