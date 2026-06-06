/**
 * scripts/run-migration-034.ts
 * Adds holiday_type column to student_attendance.
 * Run with: npx tsx scripts/run-migration-034.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
ALTER TABLE student_attendance
  ADD COLUMN IF NOT EXISTS holiday_type TEXT
  CHECK (holiday_type IN ('required', 'optional'));
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 034: adding holiday_type to student_attendance...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'student_attendance'
        AND column_name = 'holiday_type'
    `)
    if (result.rows.length > 0) {
      console.log("✅ holiday_type column verified in student_attendance.")
    } else {
      console.error("❌ Column NOT created!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
