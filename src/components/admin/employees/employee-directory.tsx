"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Users,
  Mail,
  Phone,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Employee, Department } from "@/types"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_CFG = {
  active:     { label: "Active",    cls: "bg-green-50 text-green-700 border-green-200" },
  inactive:   { label: "Inactive",  cls: "bg-gray-50 text-gray-600 border-gray-200" },
  on_notice:  { label: "On Notice", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  resigned:   { label: "Resigned",  cls: "bg-red-50 text-red-600 border-red-200" },
} as const

const EMP_TYPE_CFG = {
  full_time:    { label: "Full Time",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  part_time:    { label: "Part Time",    cls: "bg-purple-50 text-purple-700 border-purple-200" },
  contractual:  { label: "Contract",     cls: "bg-orange-50 text-orange-700 border-orange-200" },
} as const

// Sentinel value used in place of an empty string, since shadcn Select
// does not support empty-string values.
const ALL = "__all__"

/* ------------------------------------------------------------------ */
/*  Avatar helper                                                        */
/* ------------------------------------------------------------------ */

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="size-14 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    )
  }

  return (
    <div className="size-14 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center ring-2 ring-white shadow-sm">
      {initials}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type EmployeeDirectoryProps = {
  canEdit: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function EmployeeDirectory({ canEdit }: EmployeeDirectoryProps) {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // Converts the ALL sentinel back to an empty string for API params
  const toParam = (v: string) => (v === ALL ? "" : v)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ t: String(Date.now()) })
    if (filterDept)   params.set("departmentId",    filterDept)
    if (filterType)   params.set("employmentType",  filterType)
    if (filterStatus) params.set("status",          filterStatus)

    Promise.all([
      fetch(`/api/admin/employees?${params}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/employees/departments",      { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([empData, deptData]) => {
        setEmployees(empData.employees ?? [])
        setDepartments(deptData.departments ?? [])
      })
      .finally(() => setLoading(false))
  }, [filterDept, filterType, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = employees.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, email or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-default bg-white pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Department filter */}
        <Select
          value={filterDept || ALL}
          onValueChange={(v) => setFilterDept(toParam(v))}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Employment type filter */}
        <Select
          value={filterType || ALL}
          onValueChange={(v) => setFilterType(toParam(v))}
        >
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="contractual">Contractual</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filterStatus || ALL}
          onValueChange={(v) => setFilterStatus(toParam(v))}
        >
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_notice">On Notice</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-default bg-white p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="size-14 rounded-full bg-subtle" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-subtle rounded w-3/4" />
                  <div className="h-3 bg-subtle rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-subtle rounded" />
                <div className="h-3 bg-subtle rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
          <Users className="size-10 opacity-25" />
          <p className="text-sm font-medium">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp) => {
            const statusCfg = STATUS_CFG[emp.status] ?? STATUS_CFG.active
            const typeCfg   = EMP_TYPE_CFG[emp.employmentType] ?? EMP_TYPE_CFG.full_time

            return (
              <button
                key={emp.id}
                onClick={() => router.push(`/admin/employees/${emp.id}`)}
                className="text-left rounded-2xl border border-default bg-white p-5 hover:border-primary hover:shadow-md transition-all group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar url={emp.profilePhotoUrl} name={emp.fullName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {emp.fullName}
                    </p>
                    <p className="text-[11px] text-muted truncate">{emp.employeeCode}</p>
                    {emp.designation && (
                      <p className="text-[11px] text-secondary mt-0.5 truncate">{emp.designation}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeCfg.cls}`}>
                    {typeCfg.label}
                  </span>
                  {emp.department && (
                    <span className="inline-flex items-center rounded-full border border-default bg-subtle px-2 py-0.5 text-[10px] font-semibold text-secondary">
                      {emp.department.name}
                    </span>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] text-secondary truncate">
                    <Mail className="size-3 text-muted shrink-0" />
                    {emp.email}
                  </p>
                  {emp.phone && (
                    <p className="flex items-center gap-1.5 text-[11px] text-secondary">
                      <Phone className="size-3 text-muted shrink-0" />
                      {emp.phone}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted">
        {filtered.length} of {employees.length} employee{employees.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}