import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { canViewTasks } from "@/lib/permissions"

export default async function TasksRootPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/dashboard")
  }
  redirect("/admin/tasks/list")
}
