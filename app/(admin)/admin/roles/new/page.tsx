"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RoleFormPage } from "@/components/admin/role-form"

export default function NewRolePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(data: {
    name: string
    label: string
    description: string
    permissions: Array<{ module: string; action: string }>
  }) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? "Failed to create role.")
          return
        }
        toast.success("Role created successfully")
        router.push("/admin/roles")
      } catch {
        toast.error("Network error. Please try again.")
      }
    })
  }

  return (
    <RoleFormPage
      pageTitle="Create New Role"
      pageSubtitle="Define a custom role and assign permissions."
      onSubmit={handleSubmit}
      loading={isPending}
    />
  )
}
