/**
 * Checks which attendance-related tables exist in the database.
 */
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

async function main() {
  const { sql } = await import("../src/lib/db")

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'attendance_punches',
        'student_attendance',
        'attendance_notifications',
        'trusted_ips'
      )
    ORDER BY table_name
  `

  console.log("Tables found in database:")
  if (tables.length === 0) {
    console.log("  ⚠️  NONE of the attendance tables exist!")
  } else {
    tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`))
  }

  // Also check columns of student_attendance if it exists
  const saExists = tables.find((t: any) => t.table_name === "student_attendance")
  if (saExists) {
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'student_attendance'
      ORDER BY ordinal_position
    `
    console.log("\nstudent_attendance columns:")
    cols.forEach((c: any) => console.log(`  ${c.column_name} (${c.data_type})`))
  }
}

main().catch(console.error)
