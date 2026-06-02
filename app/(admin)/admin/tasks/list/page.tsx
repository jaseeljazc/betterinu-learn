import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { canViewTasks } from "@/lib/permissions"
import { TaskList } from "@/components/tasks/task-list"

export default async function TasksListPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/dashboard")
  }

  return <TaskList />
}
