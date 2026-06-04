"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Bell, X, RefreshCw, UserCheck, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type TaskNotification = {
  id: string
  taskId: string
  taskCode: string
  taskTitle: string
  message: string
  actionUrl: string | null
  isRead: boolean
  createdAt: string
  reassignedTo: string | null
  claimantName: string
  reassignedToName: string | null
  type: "task"
}

type AttendanceNotification = {
  id: string
  message: string
  action_url: string | null
  ip_address: string
  is_read: boolean
  created_at: string
  student_name: string
  student_email: string
  punch_in: string
  punch_out: string | null
  type: "attendance"
}

type UnifiedNotification = TaskNotification | AttendanceNotification

type Assignee = {
  id: string
  fullName: string
}

type TaskApiResponse = {
  success: boolean
  data: Omit<TaskNotification, "type">[]
  unreadCount: number
  assignees: Assignee[]
}

type AttendanceApiResponse = {
  success: boolean
  data: Omit<AttendanceNotification, "type">[]
  unreadCount: number
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  NotificationBell                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

export function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false)
  const [reassigningId, setReassigningId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: taskData, isLoading: isTaskLoading, refetch: refetchTasks, isFetching: isFetchingTasks } = useQuery<TaskApiResponse>({
    queryKey: ["task-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/employees/tasks/notifications", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch task notifications")
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const { data: attendanceData, isLoading: isAttendanceLoading, refetch: refetchAttendance, isFetching: isFetchingAttendance } = useQuery<AttendanceApiResponse>({
    queryKey: ["attendance-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/attendance/notifications", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch attendance notifications")
      return res.json()
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const [taskRes, attendanceRes] = await Promise.all([
        fetch("/api/admin/employees/tasks/notifications", {
          method: "PATCH",
          credentials: "include",
        }),
        fetch("/api/admin/attendance/notifications", {
          method: "PATCH",
          credentials: "include",
        }),
      ])
      if (!taskRes.ok || !attendanceRes.ok) throw new Error("Failed to mark notifications read")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] })
      queryClient.invalidateQueries({ queryKey: ["attendance-notifications"] })
    },
  })

  const reassignMutation = useMutation({
    mutationFn: async ({
      notifId,
      newAssigneeId,
    }: {
      notifId: string
      newAssigneeId: string
    }) => {
      const res = await fetch(
        `/api/admin/employees/tasks/notifications/${notifId}/reassign`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newAssigneeId }),
        }
      )
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to reassign")
      return json
    },
    onSuccess: () => {
      toast.success("Task reassigned successfully")
      setReassigningId(null)
      queryClient.invalidateQueries({ queryKey: ["task-notifications"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["tasks-board"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const taskNotifications: TaskNotification[] = (taskData?.data ?? []).map((n) => ({
    ...n,
    type: "task",
  }))

  const attendanceNotifications: AttendanceNotification[] = (attendanceData?.data ?? []).map((n) => ({
    ...n,
    type: "attendance",
  }))

  const allNotifications: UnifiedNotification[] = [...taskNotifications, ...attendanceNotifications].sort((a, b) => {
    const timeA = new Date(a.type === "task" ? (a as TaskNotification).createdAt : (a as AttendanceNotification).created_at).getTime()
    const timeB = new Date(b.type === "task" ? (b as TaskNotification).createdAt : (b as AttendanceNotification).created_at).getTime()
    return timeB - timeA
  })

  const totalUnread = (taskData?.unreadCount ?? 0) + (attendanceData?.unreadCount ?? 0)
  const assignees = taskData?.assignees ?? []
  const isLoading = isTaskLoading || isAttendanceLoading
  const isFetching = isFetchingTasks || isFetchingAttendance

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen && !open && totalUnread > 0) {
      markAllReadMutation.mutate()
    }
    if (!isOpen) {
      setReassigningId(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Bell trigger */}
        <button
          title="Notifications"
          className={cn(
            "relative flex items-center justify-center rounded-lg transition-colors hover:bg-subtle hover:text-primary text-secondary",
            collapsed ? "p-3 w-full" : "p-2",
            open && "bg-primary/10 text-primary"
          )}
          aria-label="Open notifications"
        >
          <Bell className="size-5 shrink-0" />
          {totalUnread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
              style={{ background: "var(--danger-500)" }}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-default bg-subtle/50 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Notifications</span>
            {totalUnread > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--danger-500)" }}
              >
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                refetchTasks()
                refetchAttendance()
              }}
              disabled={isFetching}
              className="flex items-center justify-center rounded p-1.5 text-secondary hover:bg-subtle hover:text-primary transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded p-1.5 text-secondary hover:bg-subtle hover:text-primary transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-default" style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <Bell className="size-8 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground font-medium">
                No notifications
              </p>
              <p className="text-[10px] text-muted-foreground">
                You are all caught up!
              </p>
            </div>
          ) : (
            allNotifications.map((notif) => {
              if (notif.type === "attendance") {
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "px-4 py-3 flex flex-col gap-1.5 transition-colors hover:bg-subtle/30",
                      !notif.is_read && "border-l-2 border-l-amber-500 bg-amber-500/[0.03]"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0 size-6 rounded-full bg-amber-100 flex items-center justify-center">
                        <ShieldAlert className="size-3 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug text-foreground">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(notif.created_at)} • IP: {notif.ip_address}
                        </p>
                      </div>
                    </div>
                    {notif.action_url && (
                      <div className="ml-8 mt-0.5">
                        <Link
                          href={notif.action_url}
                          onClick={() => setOpen(false)}
                          className="text-[10px] font-semibold text-amber-700 hover:underline"
                        >
                          View flagged →
                        </Link>
                      </div>
                    )}
                  </div>
                )
              }

              // Task notification rendering
              const isReassigning = reassigningId === notif.id
              const alreadyReassigned = !!notif.reassignedTo

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "px-4 py-3 flex flex-col gap-1.5 transition-colors hover:bg-subtle/30",
                    !notif.isRead && "border-l-2 border-l-primary bg-primary/[0.03]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="size-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug text-foreground">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>

                  {alreadyReassigned && (
                    <div className="flex items-center gap-1.5 ml-8 mt-0.5">
                      <UserCheck className="size-3 text-green-600" />
                      <span className="text-[10px] text-green-700 font-medium">
                        Reassigned to {notif.reassignedToName}
                      </span>
                    </div>
                  )}

                  {!alreadyReassigned && (
                    <div className="flex items-center gap-2 ml-8 flex-wrap">
                      {notif.actionUrl && (
                        <Link
                          href={notif.actionUrl.replace(
                            process.env.NEXT_PUBLIC_APP_URL ?? "",
                            ""
                          ) || `/admin/tasks/${notif.taskId}`}
                          onClick={() => setOpen(false)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          View task →
                        </Link>
                      )}

                      {!isReassigning ? (
                        <button
                          onClick={() => setReassigningId(notif.id)}
                          className="text-[10px] font-semibold rounded px-2 py-0.5 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Reassign
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap w-full">
                          <select
                            className="flex-1 h-7 rounded border border-border text-xs px-2 bg-card text-foreground outline-none"
                            defaultValue=""
                            onChange={(e) => {
                              if (!e.target.value) return
                              reassignMutation.mutate({
                                notifId: notif.id,
                                newAssigneeId: e.target.value,
                              })
                            }}
                          >
                            <option value="">Select assignee…</option>
                            {assignees.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.fullName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setReassigningId(null)}
                            className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {allNotifications.length > 0 && (
          <div className="px-4 py-2.5 border-t border-default bg-subtle/30 shrink-0">
            <p className="text-[10px] text-muted-foreground text-center">
              Showing last {allNotifications.length} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
