import { redirect, notFound } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { hasPermission, canViewTasks } from "@/lib/permissions"
import { sql } from "@/lib/db"
import { ProjectDetailView } from "@/components/tasks/project-detail-view"

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/tasks/projects")
  }

  const { projectId } = await params

  const rows = await sql`
    SELECT
      tp.id,
      tp.name,
      tp.description,
      tp.is_active,
      tp.created_at,
      d.name       AS department_name,
      aa.full_name AS created_by_name
    FROM task_projects tp
    LEFT JOIN departments d ON d.id = tp.department_id
    LEFT JOIN admin_accounts aa ON aa.id = tp.created_by
    WHERE tp.id = ${projectId} AND tp.is_active = TRUE
  `

  if (!rows.length) notFound()

  const project = {
    id: rows[0].id as string,
    name: rows[0].name as string,
    description: (rows[0].description as string | null) ?? null,
    departmentName: (rows[0].department_name as string | null) ?? null,
    createdByName: (rows[0].created_by_name as string | null) ?? null,
    createdAt: rows[0].created_at as string,
  }

  const canManageSprints = hasPermission(
    session.role,
    session.permissions,
    "tasks_mgmt",
    "manage_sprints"
  )

  return (
    <ProjectDetailView
      project={project}
      canManageSprints={canManageSprints}
    />
  )
}
