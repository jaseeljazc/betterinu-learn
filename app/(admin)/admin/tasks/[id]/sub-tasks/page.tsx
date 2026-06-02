import { redirect } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { hasPermission, canViewTasks } from "@/lib/permissions"
import { GitBranch } from "lucide-react"

type SubTasksPageProps = {
  params: Promise<{ id: string }>
}

export default async function SubTasksPage({ params }: SubTasksPageProps) {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/tasks")
  }

  const { id } = await params

  return (
    <div
      className="rounded-lg border p-8"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="mb-4 flex items-center gap-3">
        <GitBranch className="size-5" style={{ color: "var(--green-700)" }} />
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          Sub-Tasks
        </h2>
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Sub-tasks for parent task <code className="font-mono">{id}</code> will be listed here.
      </p>
    </div>
  )
}
