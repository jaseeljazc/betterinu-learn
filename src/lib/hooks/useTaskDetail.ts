import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export type Comment = {
  id: string
  body: string
  createdAt: string
  updatedAt?: string
  authorId: string
  authorName?: string
}

export type AuditEntry = {
  id: string
  fieldName: string
  oldValue?: string | null
  newValue?: string | null
  action: string
  changedAt: string
  changedBy?: { id: string; fullName: string } | null
}

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const res = await fetch(`/api/admin/employees/tasks/${taskId}/comments`, { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []).map((c: any) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    authorId: c.author_id,
    authorName: c.author_name,
  }))
}

export async function fetchAuditLog(taskId: string): Promise<AuditEntry[]> {
  const res = await fetch(`/api/admin/employees/tasks/${taskId}/audit`, { credentials: "include" })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data ?? []).map((e: any) => ({
    id: e.id,
    fieldName: e.fieldName,
    oldValue: e.oldValue,
    newValue: e.newValue,
    action: e.action,
    changedAt: e.changedAt,
    changedBy: e.changedBy ?? null,
  }))
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => fetchComments(taskId),
    staleTime: 15_000,
  })
}

export function useTaskAudit(taskId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["task-audit", taskId],
    queryFn: () => fetchAuditLog(taskId),
    staleTime: 30_000,
    enabled,
  })
}

export function useUpdateTaskStatus(taskId: string, setOptimisticStatus: (s: string | null) => void) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json
    },
    onMutate: async (newStatus) => {
      setOptimisticStatus(newStatus)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setOptimisticStatus(null)
    },
    onSuccess: () => {
      toast.success("Status updated")
      router.refresh()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["task-audit", taskId] })
    }
  })
}

export function useAddTaskComment(taskId: string, currentUserId: string, currentUserName: string, onSuccessCb: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comment: string) => {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json.data
    },
    onMutate: async (newCommentText) => {
      await queryClient.cancelQueries({ queryKey: ["task-comments", taskId] })
      const previousComments = queryClient.getQueryData<Comment[]>(["task-comments", taskId])
      if (previousComments) {
        queryClient.setQueryData<Comment[]>(["task-comments", taskId], [
          ...previousComments,
          {
            id: "temp-" + Date.now(),
            body: newCommentText,
            createdAt: new Date().toISOString(),
            authorId: currentUserId,
            authorName: currentUserName,
          },
        ])
      }
      return { previousComments }
    },
    onError: (err, _, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["task-comments", taskId], context.previousComments)
      }
      toast.error((err as Error).message)
    },
    onSuccess: () => {
      onSuccessCb()
      toast.success("Comment added")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-audit", taskId] })
    },
  })
}

export function useEditTaskComment(taskId: string, onSuccessCb: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}/comments/${commentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: body }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json
    },
    onSuccess: () => {
      toast.success("Comment updated")
      onSuccessCb()
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-audit", taskId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json
    },
    onSuccess: () => {
      toast.success("Comment deleted")
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-audit", taskId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleTaskActive(taskId: string) {
  const router = useRouter()

  return useMutation({
    mutationFn: async (active: boolean) => {
      const res = await fetch(`/api/admin/employees/tasks/${taskId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json
    },
    onSuccess: (_, active) => {
      toast.success(active ? "Task re-enabled" : "Task disabled")
      router.refresh()
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
