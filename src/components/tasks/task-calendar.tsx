"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Task = {
  id: string
  taskId: string
  title: string
  status: string
  priority: string
  isActive: boolean
  dueDate?: string | null
  project?: { id: string; name: string } | null
}

const PRIORITY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string; pill: string }
> = {
  low: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    dot: "#3b82f6",
    pill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  },
  medium: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "#ca8a04",
    pill: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  },
  high: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    dot: "#f97316",
    pill: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "#ef4444",
    pill: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const TOTAL_CELLS = 42

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function formatDateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

async function fetchTasks(dueAfter: string, dueBefore: string): Promise<Task[]> {
  const qs = new URLSearchParams({
    due_after: dueAfter,
    due_before: dueBefore,
    limit: "200",
  })
  const res = await fetch(`/api/admin/employees/tasks?${qs.toString()}`, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const json = await res.json()
  return json.data ?? []
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function TaskCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed

  // 1. Month boundaries calculations
  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // 2. Trailing/current/leading lists
  const prevDaysList = useMemo(() => {
    if (firstDayIndex === 0) return []
    return Array.from(
      { length: firstDayIndex },
      (_, i) => daysInPrevMonth - firstDayIndex + 1 + i
    )
  }, [firstDayIndex, daysInPrevMonth])

  const daysList = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [daysInMonth])

  const nextDaysCount = TOTAL_CELLS - prevDaysList.length - daysList.length
  const nextDaysList = useMemo(() => {
    return Array.from({ length: nextDaysCount }, (_, i) => i + 1)
  }, [nextDaysCount])

  // 3. Grid date bounds for fetching
  const gridStartDateStr = useMemo(() => {
    let startYear = year
    let startMonth = month - 1
    let startDay = daysInPrevMonth - firstDayIndex + 1
    if (firstDayIndex === 0) {
      startMonth = month
      startDay = 1
    }
    if (startMonth < 0) {
      startMonth = 11
      startYear -= 1
    }
    return formatDateString(startYear, startMonth, startDay)
  }, [year, month, firstDayIndex, daysInPrevMonth])

  const gridEndDateStr = useMemo(() => {
    let endYear = year
    let endMonth = month + 1
    let endDay = nextDaysCount
    if (endMonth > 11) {
      endMonth = 0
      endYear += 1
    }
    return formatDateString(endYear, endMonth, endDay)
  }, [year, month, nextDaysCount])

  // 4. Data query
  const { data: tasks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["tasks-calendar", gridStartDateStr, gridEndDateStr],
    queryFn: () => fetchTasks(gridStartDateStr, gridEndDateStr),
    staleTime: 30_000,
  })

  // Group active tasks by their local due_date split
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((t) => {
      if (!t.isActive || !t.dueDate) return
      const dateStr = t.dueDate.split("T")[0]
      const list = map.get(dateStr) || []
      list.push(t)
      map.set(dateStr, list)
    })
    return map
  }, [tasks])

  // 5. Navigation handlers
  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Calendar Header / Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 border-b"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex items-center justify-center h-9 w-9 rounded-md border border-default bg-surface hover:bg-subtle cursor-pointer text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="flex items-center justify-center h-9 w-9 rounded-md border border-default bg-surface hover:bg-subtle cursor-pointer text-foreground transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 h-9 rounded-md border border-default bg-surface hover:bg-subtle text-xs font-semibold text-foreground cursor-pointer transition-colors"
          >
            Today
          </button>
          <h2 className="text-base font-bold text-foreground ml-2">{monthLabel}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
            className="flex items-center justify-center h-9 w-9 rounded-md border transition-colors hover:bg-subtle cursor-pointer text-foreground"
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Days of week labels */}
      <div
        className="grid grid-cols-7 gap-[1px] border-b"
        style={{ background: "var(--border-muted)", borderColor: "var(--border-muted)" }}
      >
        {DAY_LABELS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs font-semibold py-2 bg-surface",
              (i === 0 || i === 6) ? "text-muted-foreground/60" : "text-muted-foreground"
            )}
            style={{ background: "var(--bg-surface)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Cells Grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-[1px] bg-slate-100 dark:bg-slate-800">
          {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="min-h-[100px] sm:min-h-[120px] bg-surface animate-pulse"
              style={{ background: "var(--bg-surface)" }}
            />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-7 gap-[1px]"
          style={{ background: "var(--border-muted)" }}
        >
          {/* Previous month trailing cells */}
          {prevDaysList.map((day) => {
            const prevMonth = month === 0 ? 11 : month - 1
            const prevYear = month === 0 ? year - 1 : year
            const dateStr = formatDateString(prevYear, prevMonth, day)
            const dayTasks = tasksByDate.get(dateStr) ?? []

            return (
              <div
                key={`prev-${day}`}
                className="min-h-[100px] sm:min-h-[120px] p-1.5 flex flex-col justify-between opacity-40"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
                </div>
                <div className="flex-1 mt-1 overflow-y-auto max-h-[80px] space-y-1">
                  {dayTasks.map((t) => {
                    const cfg = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/tasks/${t.id}`}
                        className={cn(
                          "block truncate text-[10px] font-medium px-1.5 py-0.5 rounded border transition-all hover:opacity-85 select-none",
                          cfg.pill
                        )}
                        title={`${t.taskId}: ${t.title}`}
                      >
                        {t.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Current month active cells */}
          {daysList.map((day) => {
            const dateStr = formatDateString(year, month, day)
            const dayTasks = tasksByDate.get(dateStr) ?? []
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString()

            return (
              <div
                key={`day-${day}`}
                className="min-h-[100px] sm:min-h-[120px] p-1.5 flex flex-col justify-between group transition-colors"
                style={{ background: "var(--bg-surface)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-bold flex size-5 items-center justify-center rounded-full leading-none",
                      isToday
                        ? "bg-green-700 text-white"
                        : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </span>
                </div>
                <div className="flex-1 mt-1 overflow-y-auto max-h-[85px] space-y-1 scrollbar-none">
                  {dayTasks.map((t) => {
                    const cfg = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/tasks/${t.id}`}
                        className={cn(
                          "block truncate text-[10px] font-medium px-1.5 py-0.5 rounded border transition-all hover:opacity-85 select-none",
                          cfg.pill
                        )}
                        title={`${t.taskId}: ${t.title}`}
                      >
                        {t.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Next month leading cells */}
          {nextDaysList.map((day) => {
            const nextMonth = month === 11 ? 0 : month + 1
            const nextYear = month === 11 ? year + 1 : year
            const dateStr = formatDateString(nextYear, nextMonth, day)
            const dayTasks = tasksByDate.get(dateStr) ?? []

            return (
              <div
                key={`next-${day}`}
                className="min-h-[100px] sm:min-h-[120px] p-1.5 flex flex-col justify-between opacity-40"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
                </div>
                <div className="flex-1 mt-1 overflow-y-auto max-h-[80px] space-y-1">
                  {dayTasks.map((t) => {
                    const cfg = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.medium
                    return (
                      <Link
                        key={t.id}
                        href={`/admin/tasks/${t.id}`}
                        className={cn(
                          "block truncate text-[10px] font-medium px-1.5 py-0.5 rounded border transition-all hover:opacity-85 select-none",
                          cfg.pill
                        )}
                        title={`${t.taskId}: ${t.title}`}
                      >
                        {t.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend Block */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-4 border-t text-xs"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Legend:</span>
        {Object.entries(PRIORITY_COLORS).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-foreground font-semibold capitalize">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  )
}
