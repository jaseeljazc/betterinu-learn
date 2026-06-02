import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { hasPermission } from "@/lib/permissions"
import { TasksDashboard } from "@/components/tasks/tasks-dashboard"

export default async function TasksDashboardPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "tasks_mgmt", "view_dashboard")) {
    redirect("/admin/tasks/list")
  }

  return <TasksDashboard />
}
