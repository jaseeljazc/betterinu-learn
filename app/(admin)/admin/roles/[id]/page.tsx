"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RoleFormPage } from "@/components/admin/role-form"
import type { AdminRoleRecord } from "@/types"
import RoboLoader from "@/components/loading/robo-loader"

type Props = { params: Promise<{ id: string }> }

export default function EditRolePage({ params }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<AdminRoleRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { id } = await params
      const res = await fetch(`/api/admin/roles/${id}`)
      if (!res.ok) {
        toast.error("Role not found")
        router.push("/admin/roles")
        return
      }
      const data = await res.json()
      setRole(data.role)
      setLoading(false)
    }
    load().catch(console.error)
  }, [params, router])

  async function handleSubmit(data: {
    name: string
    label: string
    description: string
    permissions: Array<{ module: string; action: string }>
  }) {
    if (!role) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/roles/${role.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? "Failed to update role.")
          return
        }
        toast.success("Role updated successfully")
        router.push("/admin/roles")
      } catch {
        toast.error("Network error. Please try again.")
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <RoboLoader />
      </div>
    )
  }

  return (
    <RoleFormPage
      pageTitle="Edit Role"
      pageSubtitle={
        role?.isSystem
          ? "System role — name and description are locked. Permissions are editable."
          : "Update this role's name, description, and permissions."
      }
      initialData={role ?? undefined}
      onSubmit={handleSubmit}
      loading={isPending}
    />
  )
}
