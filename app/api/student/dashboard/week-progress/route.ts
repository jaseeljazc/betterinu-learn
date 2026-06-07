import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/dashboard/week-progress
 *
 * Returns the student's current-week learning progress:
 * - Which week and day they are currently on
 * - Lessons completed vs total in that week
 * - Overall course info
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  try {
    // Fetch the student's first enrolled active course with curriculum
    const courseRows = await sql`
      SELECT c.id, c.title, c.image, c.curriculum
      FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.student_id = ${student.studentId}
        AND c.is_active = true
      ORDER BY sc.assigned_at
      LIMIT 1
    `

    if (courseRows.length === 0) {
      console.warn("[week-progress] No enrolled course for studentId:", student.studentId)
      return NextResponse.json({ error: "No enrolled course found" }, { status: 404 })
    }

    const course = courseRows[0]
    
    // Fetch modern curriculum from course_weeks table
    const weeksRows = await sql`
      SELECT * FROM course_weeks
      WHERE course_id = ${course.id}
      ORDER BY position ASC
    `
    const curriculum: any[] = weeksRows.length > 0 ? weeksRows : (course.curriculum ?? [])

    // Fetch the student's progress_state JSONB (this is where the frontend saves completions)
    const progressStateRows = await sql`
      SELECT progress_state FROM students WHERE id = ${student.studentId}
    `

    const progressState = progressStateRows[0]?.progress_state ?? {}
    const completedSubModuleIds = new Set<string>(
      (progressState.completedSubModules ?? []).map((id: any) => String(id))
    )

    console.log("[week-progress] courseId:", course.id, "curriculum weeks:", curriculum.length)
    console.log("[week-progress] completedSubModules count:", completedSubModuleIds.size)
    if (curriculum.length > 0) {
      const firstWeek = curriculum[0]
      console.log("[week-progress] first week days count:", firstWeek?.days?.length ?? 0)
      if (firstWeek?.days?.[0]) {
        const firstDay = firstWeek.days[0]
        console.log("[week-progress] first day subModules count:", firstDay?.subModules?.length ?? "N/A — keys:", Object.keys(firstDay))
      }
    }

    // Determine "current week" = the first week that has at least one incomplete lesson.
    // If all weeks are complete, return the last week.
    let currentWeek: any = null
    let currentWeekIndex = 0

    for (let wi = 0; wi < curriculum.length; wi++) {
      const week = curriculum[wi]
      const weekSubModuleIds: string[] = (week.days ?? []).flatMap((day: any) =>
        (day.subModules ?? []).map((m: any) => String(m.id))
      )
      const allDone = weekSubModuleIds.every((id) => completedSubModuleIds.has(id))
      if (!allDone || wi === curriculum.length - 1) {
        currentWeek = week
        currentWeekIndex = wi
        break
      }
    }

    if (!currentWeek) {
      // Curriculum is empty in DB — fall back to raw progress_state data
      const completedCount = completedSubModuleIds.size

      // Try to derive current week/day from completed day IDs stored in progress_state
      // Day IDs follow the pattern: "<courseId>-w<weekNum>-d<dayNum>" or "week-<n>-day-<m>"
      const completedDayIds: string[] = (progressState.completedDays ?? []).map(String)

      let weekNumber = 1
      let dayNumber = 1

      if (completedDayIds.length > 0) {
        // Parse all completed day positions and find the furthest one
        let maxWeek = 0
        let maxDayInMaxWeek = 0
        for (const dayId of completedDayIds) {
          // Match patterns like: "course-w2-d3", "w2-d3", "week-2-day-3"
          const m1 = dayId.match(/w(\d+)[_-]d(\d+)/i)
          const m2 = dayId.match(/week[_-](\d+)[_-]day[_-](\d+)/i)
          const m = m1 ?? m2
          if (m) {
            const w = parseInt(m[1], 10)
            const d = parseInt(m[2], 10)
            if (w > maxWeek || (w === maxWeek && d > maxDayInMaxWeek)) {
              maxWeek = w
              maxDayInMaxWeek = d
            }
          }
        }
        if (maxWeek > 0) {
          // They are on the NEXT day after the last completed day
          weekNumber = maxWeek
          dayNumber = maxDayInMaxWeek + 1
        }
      }

      // Use overall pct based on completed count vs course total_modules if available
      const dbTotalModules: number = courseRows[0]?.total_modules ?? 0
      const overallPct = dbTotalModules > 0
        ? Math.round((completedCount / dbTotalModules) * 100)
        : 0

      return NextResponse.json({
        courseId: course.id,
        courseTitle: course.title,
        thumbnailUrl: course.image ?? null,
        weekNumber,
        weekTitle: `Week ${weekNumber}`,
        dayNumber,
        dayTitle: `Day ${dayNumber}`,
        weekCompleted: completedCount,
        weekTotal: dbTotalModules,
        weekPct: overallPct,
        completedModules: completedCount,
        totalModules: dbTotalModules,
        overallPct,
      })
    }

    // Build week-level stats
    const weekDays: any[] = currentWeek.days ?? []
    const weekSubModuleIds: string[] = weekDays.flatMap((day: any) =>
      (day.subModules ?? []).map((m: any) => String(m.id))
    )
    const weekTotal = weekSubModuleIds.length
    const weekCompleted = weekSubModuleIds.filter((id) => completedSubModuleIds.has(id)).length
    const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

    // Determine current day = first day in the current week with incomplete lessons
    let currentDay: any = null
    let currentDayIndex = 0
    for (let di = 0; di < weekDays.length; di++) {
      const day = weekDays[di]
      const daySubModuleIds: string[] = (day.subModules ?? []).map((m: any) => String(m.id))
      const allDayDone = daySubModuleIds.every((id) => completedSubModuleIds.has(id))
      if (!allDayDone || di === weekDays.length - 1) {
        currentDay = day
        currentDayIndex = di
        break
      }
    }

    // Overall course stats
    const allSubModuleIds: string[] = curriculum.flatMap((week: any) =>
      (week.days ?? []).flatMap((day: any) =>
        (day.subModules ?? []).map((m: any) => String(m.id))
      )
    )
    const totalModules = allSubModuleIds.length
    const completedModules = allSubModuleIds.filter((id) => completedSubModuleIds.has(id)).length

    return NextResponse.json({
      courseId: course.id,
      courseTitle: course.title,
      thumbnailUrl: course.image ?? null,

      // Current position
      weekNumber: currentWeekIndex + 1,
      weekTitle: currentWeek.title ?? `Week ${currentWeekIndex + 1}`,
      dayNumber: currentDayIndex + 1,
      dayTitle: currentDay?.title ?? `Day ${currentDayIndex + 1}`,

      // Week progress
      weekCompleted,
      weekTotal,
      weekPct,

      // Overall course progress
      completedModules,
      totalModules,
      overallPct: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
    })
  } catch (err) {
    console.error("Dashboard week-progress error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
