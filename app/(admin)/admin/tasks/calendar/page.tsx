"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"
import { TaskCalendar } from "@/components/tasks/task-calendar"
import RoboLoader from "@/components/loading/robo-loader"

export default function TasksCalendarPage() {
  const { can, role, isSuperAdmin, canViewTasks } = useAdminPermissions()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (typeof document !== "undefined") {
      const hasCookie = document.cookie.includes("__rbac=")
      if (!hasCookie) {
        router.push("/admin/login")
        return
      }

      const canView = isSuperAdmin || canViewTasks
      if (!canView && role) {
        router.push("/admin/dashboard")
        return
      }

      if (canView) {
        setAuthorized(true)
      }
    }
  }, [router, role, isSuperAdmin, can])

  if (!authorized) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <RoboLoader caption="Checking permissions..." />
      </div>
    )
  }

  return <TaskCalendar />
}

