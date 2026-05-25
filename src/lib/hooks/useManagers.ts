import { useQuery } from "@tanstack/react-query"
import type { Employee } from "@/types"

export type ManagerOption = { id: string; fullName: string }

async function fetchManagers(): Promise<ManagerOption[]> {
  const res = await fetch("/api/admin/employees", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch employee list")
  const data = await res.json()
  return (data.employees ?? []).map((e: Employee) => ({ id: e.id, fullName: e.fullName }))
}

export function useManagers(excludeId?: string) {
  const query = useQuery<ManagerOption[]>({
    queryKey: ["employees-for-manager"],
    queryFn: fetchManagers,
  })

  const managers = excludeId
    ? (query.data ?? []).filter((m) => m.id !== excludeId)
    : (query.data ?? [])

  return { ...query, managers }
}
