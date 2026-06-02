import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { hasPermission, canViewTasks } from "@/lib/permissions"
import { ProjectsList } from "@/components/tasks/projects-list"

export default async function ProjectsPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/dashboard")
  }

  const canManage = hasPermission(
    session.role,
    session.permissions,
    "tasks_mgmt",
    "manage_projects"
  )

  return <ProjectsList canManage={canManage} />
}
