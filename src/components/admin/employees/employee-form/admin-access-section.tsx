"use client"

import React from "react"
import { Shield, CheckCircle2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { labelCls } from "./types"

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-default">
      <Icon className="size-4 text-primary" />
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

type AdminAccessSectionProps = {
  employee?: {
    adminAccount?: {
      role: string
      status: string
    }
  }
  hasAdminAccess: boolean
  setHasAdminAccess: React.Dispatch<React.SetStateAction<boolean>>
  roleId: string
  setRoleId: (val: string) => void
  roles: { id: string; name: string; label: string }[]
  isEdit: boolean
  saving: boolean
  handleGrantAdminAccess: () => Promise<void>
}

export function AdminAccessSection({
  employee,
  hasAdminAccess,
  setHasAdminAccess,
  roleId,
  setRoleId,
  roles,
  isEdit,
  saving,
  handleGrantAdminAccess,
}: AdminAccessSectionProps) {
  return (
    <section className="rounded-md border border-default bg-white p-6 space-y-5">
      <SectionHeader icon={Shield} title="Admin Panel Access" />
      {employee?.adminAccount ? (
        <div
          className="rounded-md border px-4 py-3 flex items-center gap-3"
          style={{ background: "var(--success-50)", borderColor: "var(--success-100)" }}
        >
          <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success-600)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--success-700)" }}>
              Admin access active
            </p>
            <p className="text-xs" style={{ color: "var(--success-600)" }}>
              Role: {employee.adminAccount.role} · Status: {employee.adminAccount.status}
            </p>
          </div>
        </div>
      ) : (
        <>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setHasAdminAccess((p) => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors border border-default ${
                hasAdminAccess ? "bg-primary" : "bg-subtle"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  hasAdminAccess ? "translate-x-5" : ""
                }`}
              />
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
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
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
  )
}
