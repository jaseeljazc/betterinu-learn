"use client"

import { useState, useEffect } from "react"
import { useTasksDashboard, useTaskDepartments, useTaskProjects } from "@/lib/hooks/useTasks"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FolderOpen,
  Building2,
  User,
  RefreshCw,
  BarChart2,
  Calendar,
  ClipboardList,
  History,
  TrendingUp,
  Inbox,
  FilterX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart,
  Line,
  CartesianGrid,
} from "recharts"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type DashboardData = {
  summary: {
    totalActiveTasks: number
    overdueTasks: number
    completedThisWeek: number
    backlogCount: number
  }
  byStatus: { todo: number; doing: number; completed: number }
  byPriority: { low?: number; medium?: number; high?: number; critical?: number }
  byAssignee: { id: string; fullName: string; count: number }[]
  history30Days: { date: string; created: number; completed: number }[]
  burndown: {
    sprintName: string
    startDate?: string | null
    endDate?: string | null
    series: { date: string; totalTasks: number; completedTasks: number; remainingTasks: number }[]
  } | null
  overdueTasksList: {
    id: string
    taskId: string
    title: string
    dueDate: string
    daysOverdue: number
    assigneeName: string
  }[]
  recentAudit: {
    id: string
    taskId: string
    taskRef: string
    changedAt: string
    changedByName: string
    action: string
    fieldName: string
  }[]
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Stat Card                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  Icon,
  color,
  bg,
  sub,
}: {
  label: string
  value: number
  Icon: React.ElementType
  color: string
  bg: string
  sub?: string
}) {
  return (
    <div
      className="rounded-md border p-5 flex items-start gap-4"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div
        className="size-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        <Icon className="size-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-[11px] mt-1 font-semibold" style={{ color }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Section Card                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div
        className="px-4 py-3 border-b text-[10px] font-bold uppercase tracking-wider"
        style={{ borderColor: "var(--border-muted)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}
      >
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function TasksDashboard() {
  const router = useRouter()
  const { can } = useAdminPermissions()
  const canViewAudit = can("tasks_mgmt", "view_audit_log")

  // Mounting state to handle Recharts hydration cleanly in Next.js
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter States
  const [departmentId, setDepartmentId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Fetch Filters Metadata
  const { data: departments = [] } = useTaskDepartments()
  const { data: projects = [] } = useTaskProjects()

  // Fetch Dashboard Metrics
  const { data, isLoading, refetch, isFetching, error } = useTasksDashboard(departmentId, projectId, dateFrom, dateTo)

  const handleResetFilters = () => {
    setDepartmentId("")
    setProjectId("")
    setDateFrom("")
    setDateTo("")
  }

  if (error) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <BarChart2 className="mx-auto mb-3 size-8" style={{ color: "var(--text-disabled)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Dashboard unavailable
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          You may need the{" "}
          <code className="rounded px-1" style={{ background: "var(--bg-subtle)" }}>
            view_dashboard
          </code>{" "}
          permission to access this page.
        </p>
      </div>
    )
  }

  // Chart Data formatters
  const statusData = data
    ? [
        { name: "Todo", value: data.byStatus.todo, color: "#94a3b8" },
        { name: "Doing", value: data.byStatus.doing, color: "#f59e0b" },
        { name: "Completed", value: data.byStatus.completed, color: "#10b981" },
      ].filter((s) => s.value > 0)
    : []

  const priorityData = data
    ? [
        { name: "Low", Tasks: data.byPriority.low ?? 0, fill: "var(--success-500)" },
        { name: "Medium", Tasks: data.byPriority.medium ?? 0, fill: "var(--info-500)" },
        { name: "High", Tasks: data.byPriority.high ?? 0, fill: "var(--terra-500)" },
        { name: "Critical", Tasks: data.byPriority.critical ?? 0, fill: "var(--danger-500)" },
      ]
    : []

  const assigneeData = data
    ? data.byAssignee.map((a: any) => ({
        name: a.fullName,
        Tasks: a.count,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* ── Page Title ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Task Management Dashboard
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Performance insights and metrics filtered by department and sprint cycles
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors bg-white hover:bg-subtle"
          style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Filters Bar ───────────────────────────────────────────────────── */}
      <div
        className="rounded-md border p-4 flex flex-wrap items-end gap-4"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-muted)" }}>
            Department
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full h-9 rounded-md border px-3 text-xs outline-none bg-white transition-colors focus:border-green-700"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <option value="">All Departments</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-muted)" }}>
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-9 rounded-md border px-3 text-xs outline-none bg-white transition-colors focus:border-green-700"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 min-w-[150px]">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-muted)" }}>
            Due From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full h-9 rounded-md border px-3 text-xs outline-none bg-white"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          />
        </div>

        <div className="space-y-1.5 min-w-[150px]">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-muted)" }}>
            Due To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full h-9 rounded-md border px-3 text-xs outline-none bg-white"
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          />
        </div>

        {(departmentId || projectId || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="gap-1 text-xs shrink-0"
          >
            <FilterX className="size-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-md border h-24 animate-pulse"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border-muted)" }}
            />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total active tasks"
            value={data.summary.totalActiveTasks}
            Icon={BarChart2}
            color="var(--green-700)"
            bg="var(--green-50)"
          />
          <StatCard
            label="Overdue tasks"
            value={data.summary.overdueTasks}
            Icon={Clock}
            color={data.summary.overdueTasks > 0 ? "var(--danger-500)" : "var(--text-muted)"}
            bg={data.summary.overdueTasks > 0 ? "var(--danger-50)" : "var(--bg-subtle)"}
            sub={data.summary.overdueTasks > 0 ? "Requires action" : undefined}
          />
          <StatCard
            label="Completed this week"
            value={data.summary.completedThisWeek}
            Icon={CheckCircle2}
            color="var(--success-500)"
            bg="var(--success-50)"
            sub="Keep it up!"
          />
          <StatCard
            label="Unassigned backlog"
            value={data.summary.backlogCount}
            Icon={Inbox}
            color="var(--info-500)"
            bg="var(--info-50)"
          />
        </div>
      ) : null}

      {/* ── Charts Grid ──────────────────────────────────────────────────── */}
      {data && mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Donut */}
          <SectionCard title="Tasks by Status">
            {statusData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground" style={{ color: "var(--text-muted)" }}>
                No active tasks found matching status parameters.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {statusData.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-surface)", border: "1px solid var(--border-muted)", color: "var(--text-primary)" }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {/* Priority Vertical Bar */}
          <SectionCard title="Tasks by Priority">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={priorityData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-surface)", border: "1px solid var(--border-muted)", color: "var(--text-primary)" }} />
                  <Bar dataKey="Tasks" radius={[4, 4, 0, 0]}>
                    {priorityData.map((p) => (
                      <Cell key={p.name} fill={p.fill} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Workload Horizontal Bar */}
          <SectionCard title="Workload Per Person (Top 10 Active)">
            {assigneeData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground" style={{ color: "var(--text-muted)" }}>
                No active workload allocated yet.
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    layout="vertical"
                    data={assigneeData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-surface)", border: "1px solid var(--border-muted)", color: "var(--text-primary)" }} />
                    <Bar dataKey="Tasks" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── History Line & Sprint Burndown Grid ───────────────────────────── */}
      {data && mounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* History trend last 30 days */}
          <SectionCard title="Tasks Created vs Completed (Last 30 Days)">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data.history30Days} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-surface)", border: "1px solid var(--border-muted)", color: "var(--text-primary)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Active Sprint Burndown */}
          <SectionCard title={data.burndown ? `Sprint Burndown: ${data.burndown.sprintName}` : "Sprint Burndown"}>
            {!data.burndown || data.burndown.series.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-2">
                <TrendingUp className="size-8 text-muted-foreground" style={{ color: "var(--text-disabled)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>No sprint snapshot data yet</p>
                <p className="text-[11px] max-w-[280px]" style={{ color: "var(--text-muted)" }}>
                  Daily snapshots are collected at midnight. If the sprint was recently created or snapshots have not run, burndown data will populate tomorrow.
                </p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={data.burndown.series} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-muted)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-surface)", border: "1px solid var(--border-muted)", color: "var(--text-primary)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="remainingTasks" name="Remaining Tasks" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="totalTasks" name="Scope (Total Tasks)" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Tables Section (Overdue list & Audit Feed) ────────────────────────── */}
      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Overdue Tasks List */}
          <SectionCard title="Overdue Tasks (Most Overdue First)">
            {data.overdueTasksList.length === 0 ? (
              <p className="text-xs text-center py-6 text-muted-foreground" style={{ color: "var(--text-muted)" }}>
                Hurrah! No overdue tasks at the moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground uppercase text-[9px] tracking-wider" style={{ borderColor: "var(--border-muted)", color: "var(--text-muted)" }}>
                      <th className="py-2 px-3 font-semibold">ID</th>
                      <th className="py-2 px-3 font-semibold">Title</th>
                      <th className="py-2 px-3 font-semibold">Assignee</th>
                      <th className="py-2 px-3 font-semibold">Due Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueTasksList.map((t: any) => (
                      <tr
                        key={t.id}
                        onClick={() => router.push(`/admin/tasks/${t.id}`)}
                        className="border-b last:border-0 hover:bg-subtle/50 cursor-pointer transition-colors"
                        style={{ borderColor: "var(--border-muted)" }}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: "var(--text-muted)" }}>
                          {t.taskId}
                        </td>
                        <td className="py-2.5 px-3 font-medium truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>
                          {t.title}
                        </td>
                        <td className="py-2.5 px-3" style={{ color: "var(--text-secondary)" }}>
                          {t.assigneeName}
                        </td>
                        <td className="py-2.5 px-3 font-medium" style={{ color: "var(--danger-500)" }}>
                          {new Date(t.dueDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-destructive" style={{ color: "var(--danger-600)" }}>
                          {t.daysOverdue} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Recent Audit Activity Feed */}
          {canViewAudit && (
            <SectionCard title="Recent Task Change Log Activity">
              {data.recentAudit.length === 0 ? (
                <p className="text-xs text-center py-6 text-muted-foreground" style={{ color: "var(--text-muted)" }}>
                  No recent audit history logs.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b text-muted-foreground uppercase text-[9px] tracking-wider" style={{ borderColor: "var(--border-muted)", color: "var(--text-muted)" }}>
                        <th className="py-2 px-3 font-semibold">Timestamp</th>
                        <th className="py-2 px-3 font-semibold">Task ID</th>
                        <th className="py-2 px-3 font-semibold">Changed By</th>
                        <th className="py-2 px-3 font-semibold">Action</th>
                        <th className="py-2 px-3 font-semibold">Field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAudit.map((a: any) => (
                        <tr
                          key={a.id}
                          className="border-b last:border-0 hover:bg-subtle/30 transition-colors"
                          style={{ borderColor: "var(--border-muted)" }}
                        >
                          <td className="py-2.5 px-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {new Date(a.changedAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <Link
                              href={`/admin/tasks/${a.taskId}`}
                              className="font-mono font-bold hover:underline"
                              style={{ color: "var(--green-700)" }}
                            >
                              {a.taskRef}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 font-medium" style={{ color: "var(--text-primary)" }}>
                            {a.changedByName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded font-semibold bg-subtle text-muted-foreground" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                              {a.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                            {a.fieldName ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}
