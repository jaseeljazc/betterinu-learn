import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { TasksAuditLogView } from "@/components/tasks/tasks-audit-log"

export default async function TasksAuditPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")

  const isAuthorized = session.role === "super_admin" || session.role === "task_manager"
  if (!isAuthorized) {
    redirect("/admin/tasks/list")
  }

  return <TasksAuditLogView />
}
