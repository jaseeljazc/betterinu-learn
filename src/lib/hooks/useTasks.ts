import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Task = {
  id: string
  taskId: string
  title: string
  description?: string | null
  type: string
  status: string
  priority: string
  visibility: string
  isActive: boolean
  dueDate?: string | null
  estimatedHours?: number | null
  loggedHours?: number | null
  selfAssigned?: boolean
  selfAssignStatus?: string | null
  selfAssignDeadline?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  project?: { id: string; name: string } | null
  sprint?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  createdBy?: { id: string; fullName: string } | null
  assignedTo?: { id: string; fullName: string } | null
  reviewer?: { id: string; fullName: string } | null
  subtaskCount: number
  attachmentCount: number
  commentCount: number
}

export type TaskListMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

export type TaskFilters = {
  search: string
  status: string
  priority: string
  type: string
  assignee: string
  project_id: string
  department_id: string
  due_after: string
  due_before: string
  is_active: string
}

function buildQueryString(filters: TaskFilters, page: number) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", "25")
  if (filters.search)        params.set("search", filters.search)
  if (filters.status)        params.set("status", filters.status)
  if (filters.priority)      params.set("priority", filters.priority)
  if (filters.type)          params.set("type", filters.type)
  if (filters.assignee)      params.set("assignee", filters.assignee)
  if (filters.project_id)    params.set("project_id", filters.project_id)
  if (filters.department_id) params.set("department_id", filters.department_id)
  if (filters.due_after)     params.set("due_after", filters.due_after)
  if (filters.due_before)    params.set("due_before", filters.due_before)
  // Always send is_active so the API can apply the correct default
  params.set("is_active", filters.is_active || "true")
  return params.toString()
}

export async function fetchTasks(filters: TaskFilters, page: number): Promise<{ data: Task[]; meta: TaskListMeta }> {
  const qs = buildQueryString(filters, page)
  const res = await fetch(`/api/admin/employees/tasks?${qs}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const json = await res.json()
  return { data: json.data ?? [], meta: json.meta }
}

export function useTasksQuery(filters: TaskFilters, page: number, initialData?: { data: Task[], meta: TaskListMeta }) {
  return useQuery({
    queryKey: ["tasks", filters, page],
    queryFn: () => fetchTasks(filters, page),
    initialData:
      page === 1 &&
      !Object.entries(filters).some(([k, v]) =>
        k !== "is_active" ? !!v : v !== "true"
      )
        ? initialData
        : undefined,
    staleTime: 30_000,
  })
}

function buildInfiniteQueryString(filters: TaskFilters, page: number) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", "20")
  if (filters.search)        params.set("search", filters.search)
  if (filters.status)        params.set("status", filters.status)
  if (filters.priority)      params.set("priority", filters.priority)
  if (filters.type)          params.set("type", filters.type)
  if (filters.assignee)      params.set("assignee", filters.assignee)
  if (filters.project_id)    params.set("project_id", filters.project_id)
  if (filters.department_id) params.set("department_id", filters.department_id)
  if (filters.due_after)     params.set("due_after", filters.due_after)
  if (filters.due_before)    params.set("due_before", filters.due_before)
  params.set("is_active", filters.is_active || "true")
  return params.toString()
}

export async function fetchTasksPage(
  filters: TaskFilters,
  page: number
): Promise<{ data: Task[]; meta: TaskListMeta }> {
  const qs = buildInfiniteQueryString(filters, page)
  const res = await fetch(`/api/admin/employees/tasks?${qs}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const json = await res.json()
  return { data: json.data ?? [], meta: json.meta }
}

export function useInfiniteTasksQuery(filters: TaskFilters) {
  return useInfiniteQuery({
    queryKey: ["tasks-infinite", filters],
    queryFn: ({ pageParam = 1 }) => fetchTasksPage(filters, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta
      return page < totalPages ? page + 1 : undefined
    },
    staleTime: 30_000,
  })
}

export async function fetchProjects(): Promise<{ id: string; name: string; departmentId: string | null }[]> {
  const res = await fetch("/api/admin/employees/tasks/projects", { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    departmentId: p.departmentId ?? null,
  }))
}

export function useTaskProjects() {
  return useQuery({
    queryKey: ["task-projects-list"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  })
}

export async function fetchDepartments(): Promise<{ id: string; name: string }[]> {
  const res = await fetch("/api/admin/employees/tasks/departments", { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export function useTaskDepartments() {
  return useQuery({
    queryKey: ["departments-list"],
    queryFn: fetchDepartments,
    staleTime: 60_000,
  })
}

export async function fetchEmployees(): Promise<{ id: string; fullName: string; departmentId: string | null }[]> {
  const res = await fetch("/api/admin/employees/tasks/assignees", { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export function useTaskEmployees() {
  return useQuery({
    queryKey: ["employees-list"],
    queryFn: fetchEmployees,
    staleTime: 60_000,
  })
}

export function useDisableTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/employees/tasks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
    },
    onSuccess: () => {
      toast.success("Task disabled")
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useClaimTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/employees/tasks/${id}/claim`, {
        method: "POST",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to claim task")
      return json
    },
    onSuccess: () => {
      toast.success("Task claimed! Please confirm within the 48-hour window.")
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export async function fetchAllTasks(projectId?: string, sprintId?: string): Promise<Task[]> {
  const qs = new URLSearchParams({ view: "kanban", limit: "200" })
  if (projectId) qs.set("project_id", projectId)
  if (sprintId) qs.set("sprint_id", sprintId)
  const res = await fetch(`/api/admin/employees/tasks?${qs.toString()}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const json = await res.json()
  return json.data ?? []
}

export function useAllTasks(projectId?: string, sprintId?: string) {
  return useQuery({
    queryKey: ["tasks-board", projectId, sprintId],
    queryFn: () => fetchAllTasks(projectId || undefined, sprintId || undefined),
    staleTime: 30_000,
  })
}

export async function fetchSprints(projectId: string): Promise<{ id: string; name: string }[]> {
  if (!projectId) return []
  const res = await fetch(`/api/admin/employees/tasks/projects/${projectId}/sprints`, { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))
}

export function useTaskSprints(projectId: string) {
  return useQuery({
    queryKey: ["task-sprints", projectId],
    queryFn: () => fetchSprints(projectId),
    enabled: !!projectId,
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/employees/tasks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update status")
    },
    onSuccess: () => {
      toast.success("Task status updated")
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export async function fetchTasksDashboard(departmentId: string, projectId: string, dateFrom: string, dateTo: string) {
  const q = new URLSearchParams()
  if (departmentId) q.append("departmentId", departmentId)
  if (projectId) q.append("projectId", projectId)
  if (dateFrom) q.append("dateFrom", dateFrom)
  if (dateTo) q.append("dateTo", dateTo)

  const res = await fetch(`/api/admin/employees/tasks/dashboard?${q.toString()}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch dashboard data")
  const json = await res.json()
  return json.data
}

export function useTasksDashboard(departmentId: string, projectId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["tasks-dashboard", departmentId, projectId, dateFrom, dateTo],
    queryFn: () => fetchTasksDashboard(departmentId, projectId, dateFrom, dateTo),
    retry: false,
  })
}
