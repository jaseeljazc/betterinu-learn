/**
 * scripts/seed-course-weeks.ts
 *
 * One-shot backfill: reads every course row where `curriculum` is not null,
 * and inserts one row per week into `course_weeks`.
 *
 * Safe to re-run: uses INSERT … ON CONFLICT (id, course_id) DO NOTHING.
 *
 * Usage:
 *   npx tsx scripts/seed-course-weeks.ts
 *
 * Requires NEON_DATABASE_URL in the environment (or .env.local).
 */

import * as dotenv from "dotenv"
import * as path from "path"

// Load .env.local from the my-app root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

import { neon } from "@neondatabase/serverless"

interface WeekRow {
  id: string
  title: string
  isLocked?: boolean
  is_locked?: boolean
  isShared?: boolean
  is_shared?: boolean
  days?: unknown[]
  quiz?: unknown
  [key: string]: unknown
}

interface CourseRow {
  id: string
  curriculum: WeekRow[] | null
}

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    console.error("❌  NEON_DATABASE_URL is not set. Aborting.")
    process.exit(1)
  }

  const sql = neon(dbUrl)

  console.log("🔍  Fetching courses with non-null curriculum …")

  const courses = (await sql`
    SELECT id, curriculum
    FROM   courses
    WHERE  curriculum IS NOT NULL
      AND  jsonb_array_length(curriculum) > 0
    ORDER  BY id
  `) as CourseRow[]

  console.log(`📋  Found ${courses.length} course(s) to process.\n`)

  let totalInserted = 0
  let totalSkipped = 0
  let coursesProcessed = 0
  let coursesSkipped = 0

  for (const course of courses) {
    const weeks: WeekRow[] = Array.isArray(course.curriculum)
      ? course.curriculum
      : []

    if (weeks.length === 0) {
      coursesSkipped++
      continue
    }

    console.log(`  ➤  Course "${course.id}" — ${weeks.length} week(s)`)

    for (let position = 0; position < weeks.length; position++) {
      const week = weeks[position]

      if (!week.id || !week.title) {
        console.warn(
          `    ⚠  Week at position ${position} in course "${course.id}" is missing id or title — skipping.`
        )
        totalSkipped++
        continue
      }

      // Normalise field names: the JSON may use camelCase or snake_case
      const isLocked = week.isLocked ?? week.is_locked ?? false
      const isShared = week.isShared ?? week.is_shared ?? false
      const days = Array.isArray(week.days) ? week.days : []
      const quiz = week.quiz ?? null

      try {
        const result = await sql`
          INSERT INTO course_weeks
            (id, course_id, position, title, is_locked, is_shared, days, quiz, created_at, updated_at)
          VALUES (
            ${week.id},
            ${course.id},
            ${position},
            ${week.title},
            ${isLocked},
            ${isShared},
            ${JSON.stringify(days)},
            ${quiz !== null ? JSON.stringify(quiz) : null},
            now(),
            now()
          )
          ON CONFLICT (id, course_id) DO NOTHING
        `
        // neon returns an array; an empty array means the row was already there
        const affected = Array.isArray(result) ? result.length : 0
        if (affected === 0) {
          totalSkipped++
        } else {
          totalInserted++
        }
      } catch (err: any) {
        console.error(
          `    ✗  Failed to insert week "${week.id}" for course "${course.id}":`,
          err.message
        )
        totalSkipped++
      }
    }

    coursesProcessed++
  }

  console.log("\n════════════════════════════════════")
  console.log("  Seed complete")
  console.log(`  Courses processed : ${coursesProcessed}`)
  console.log(`  Courses skipped   : ${coursesSkipped}  (empty curriculum)`)
  console.log(`  Weeks inserted    : ${totalInserted}`)
  console.log(
    `  Weeks skipped     : ${totalSkipped}  (already existed or malformed)`
  )
  console.log("════════════════════════════════════\n")

  // ── Verification cross-check ──────────────────────────────────────────────
  console.log("🔎  Running verification cross-check …\n")

  const [weeksInTable] = (await sql`
    SELECT COUNT(*) AS total FROM course_weeks
  `) as { total: string }[]

  const [weeksInJsonb] = (await sql`
    SELECT COALESCE(SUM(jsonb_array_length(curriculum)), 0) AS total
    FROM   courses
    WHERE  curriculum IS NOT NULL
      AND  jsonb_array_length(curriculum) > 0
  `) as { total: string }[]

  console.log(`  course_weeks rows  : ${weeksInTable.total}`)
  console.log(`  curriculum entries : ${weeksInJsonb.total}`)

  if (weeksInTable.total === weeksInJsonb.total) {
    console.log("  ✅  Row counts match — migration successful!\n")
  } else {
    console.warn(
      "  ⚠  Row counts do NOT match. Investigate before proceeding to Phase 2.\n"
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
