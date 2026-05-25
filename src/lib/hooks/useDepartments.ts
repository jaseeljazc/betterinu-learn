import { useQuery } from "@tanstack/react-query"
import type { Department } from "@/types"

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch("/api/admin/employees/departments", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch departments")
  const data = await res.json()
  return data.departments ?? []
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  })
}
