"use client"

import React from "react"
import { Briefcase, DollarSign } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePickerField } from "./date-picker-field"
import { inputCls, labelCls } from "./types"

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

type EmploymentDetailsSectionProps = {
  departmentId: string
  setDepartmentId: (val: string) => void
  designation: string
  setDesignation: (val: string) => void
  employmentType: string
  setEmploymentType: (val: any) => void
  monthlySalary: string
  setMonthlySalary: (val: string) => void
  dateOfJoining: string
  setDateOfJoining: (val: string) => void
  status: string
  setStatus: (val: any) => void
  departments: { id: string; name: string }[]
  deptLoading: boolean
}

export function EmploymentDetailsSection({
  departmentId,
  setDepartmentId,
  designation,
  setDesignation,
  employmentType,
  setEmploymentType,
  monthlySalary,
  setMonthlySalary,
  dateOfJoining,
  setDateOfJoining,
  status,
  setStatus,
  departments,
  deptLoading,
}: EmploymentDetailsSectionProps) {
  return (
    <section className="rounded-md border border-default bg-white p-6 space-y-5">
      <SectionHeader icon={Briefcase} title="Employment Details" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className={labelCls}>
            Department<OptionalTag />
          </label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
              <SelectValue placeholder={deptLoading ? "Loading…" : "— None —"} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className={labelCls}>
            Designation<OptionalTag />
          </label>
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className={inputCls}
            placeholder="e.g. Senior Developer"
          />
        </div>
        <div>
          <label className={labelCls}>
            Employment Type<OptionalTag />
          </label>
          <Select value={employmentType} onValueChange={setEmploymentType}>
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
          <label className={labelCls}>
            Monthly Salary (₹)<OptionalTag />
          </label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
            <input
              type="number"
              min="0"
              step="1"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              className={`${inputCls} pl-8`}
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            Date of Joining<OptionalTag />
          </label>
          <DatePickerField
            value={dateOfJoining}
            onChange={setDateOfJoining}
            placeholder="Pick joining date"
          />
        </div>
        <div>
          <label className={labelCls}>
            Status<OptionalTag />
          </label>
          <Select value={status} onValueChange={setStatus}>
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
  )
}
