"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  AttendanceCalendarMini,
  type ProfileAttendanceRecord,
} from "@/components/admin/profile/attendance-calendar-mini"

type Props = {
  employeeId: string
}

function toMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function EmployeeAttendanceMini({ employeeId }: Props) {
  const today = new Date()
  const [month, setMonth] = useState(toMonthStr(today))
  const [records, setRecords] = useState<ProfileAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(() => {
    setLoading(true)
    fetch(
      `/api/admin/employees/attendance?month=${month}&employeeId=${employeeId}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month, employeeId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number)
    const next = new Date(y, m - 1 + delta, 1)
    setMonth(toMonthStr(next))
  }

  const isCurrentMonth = month === toMonthStr(today)

  return (
    <div className="space-y-3">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted uppercase tracking-wider">
          Attendance
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="size-6 rounded-md flex items-center justify-center hover:bg-subtle transition-colors text-muted hover:text-foreground"
            title="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[72px] text-center">
            {new Date(month + "-01").toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            className="size-6 rounded-md flex items-center justify-center hover:bg-subtle transition-colors text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next month"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <AttendanceCalendarMini month={month} records={records} loading={loading} />
    </div>
  )
}
