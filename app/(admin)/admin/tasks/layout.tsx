"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { List, LayoutGrid, Calendar, Plus, BarChart2 } from "lucide-react"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"

type TasksLayoutProps = {
  children: React.ReactNode
}

export default function TasksLayout({ children }: TasksLayoutProps) {
  const pathname = usePathname()
  const { can } = useAdminPermissions()
  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => setIsMounted(true), [])

  const canCreate = isMounted && can("tasks_mgmt", "create")
  const canViewDashboard = isMounted && can("tasks_mgmt", "view_dashboard")

  const views = [
    ...(canViewDashboard
      ? [{ href: "/admin/tasks/dashboard", label: "Dashboard", icon: BarChart2 }]
      : []),
    { href: "/admin/tasks/list",    label: "List",     icon: List },
    { href: "/admin/tasks/board",    label: "Board",    icon: LayoutGrid },
    { href: "/admin/tasks/calendar", label: "Calendar", icon: Calendar },
  ]

  function isViewActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--bg-subtle)" }}>
      {/* ── Page header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex h-16 items-center justify-between gap-4 px-6 lg:px-10">
          {/* Title */}
          <h1
            className="text-lg font-bold tracking-tight shrink-0"
            style={{ color: "var(--text-primary)" }}
          >
            Tasks
          </h1>

          
        </div>

      </div>

      {/* ── Page content ─────────────────────────────────────────── */}
      <div className="px-6 py-8 lg:px-10 flex flex-col gap-6">
        {/* View Switcher Tabs (Independent of the header, at the top of page content) */}
        {/* <div className="flex">
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-muted)",
            }}
          >
            {views.map(({ href, label, icon: Icon }) => {
              const active = isViewActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  style={
                    active
                      ? {
                          background: "var(--bg-subtle)",
                          color: "var(--green-700)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }
                      : {
                          color: "var(--text-muted)",
                        }
                  }
                >
                  <Icon className="size-3.5 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div> */}

        <div>
          {children}
        </div>
      </div>
    </div>
  )
}
