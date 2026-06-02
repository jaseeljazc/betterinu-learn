import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckSquare } from "lucide-react"
import { getPageSession } from "@/lib/server-session"
import { hasPermission } from "@/lib/permissions"
import { sql } from "@/lib/db"
import { TaskForm } from "@/components/tasks/task-form"
import { getTaskUserContext } from "@/lib/task-rbac"

type NewTaskPageProps = {
  searchParams: Promise<{ parentTaskId?: string }>
}

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "tasks_mgmt", "create")) {
    redirect("/admin/tasks/list")
  }

  const { parentTaskId } = await searchParams

  // Fetch current user's full name for the form default
  const rows = await sql`
    SELECT full_name FROM admin_accounts WHERE id = ${session.adminId}
  `
  const currentUserName = (rows[0]?.full_name as string) ?? "You"

  const userContext = await getTaskUserContext(session.adminId)
  const isSuperAdmin = session.roles.includes("super_admin")
  const defaultDepartmentId = isSuperAdmin ? undefined : (userContext.departmentId ?? undefined)

  let initialParentTask = null
  if (parentTaskId) {
    const parentRows = await sql`
      SELECT id, task_id, title FROM tasks WHERE id = ${parentTaskId}
    `
    if (parentRows.length) {
      initialParentTask = {
        id: parentRows[0].id as string,
        taskId: parentRows[0].task_id as string,
        title: parentRows[0].title as string,
      }
    }
  }

  return (
    <div className="w-full min-h-screen bg-subtle ">
      <div className="mb-8">
        <Link href="/admin/tasks/list" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Back to Tasks
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <CheckSquare className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Add New Task
          </h1>
        </div>
        <p className="text-sm text-secondary">Fill in the task details below.</p>
      </div>

      <TaskForm
        currentUserId={session.adminId}
        currentUserName={currentUserName}
        initialParentTask={initialParentTask}
        defaultDepartmentId={defaultDepartmentId}
      />
    </div>
  )
}
