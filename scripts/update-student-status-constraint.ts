/**
 * scripts/update-student-status-constraint.ts
 * Updates status check constraint for student_attendance to include:
 * Present, Late, Early_Checkout, Half_Day, Absent, Holiday, Leave
 */
import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { join } from "path"
dotenv.config({ path: join(process.cwd(), ".env.local") })

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set")

  const client = new Client(url)
  await client.connect()

  try {
    console.log("Dropping old status check constraint...")
    await client.query(`
      ALTER TABLE student_attendance
      DROP CONSTRAINT IF EXISTS student_attendance_status_check;
    `)

    console.log("Adding new status check constraint...")
    await client.query(`
      ALTER TABLE student_attendance
      ADD CONSTRAINT student_attendance_status_check
      CHECK (status IN ('Present', 'Late', 'Early_Checkout', 'Half_Day', 'Absent', 'Holiday', 'Leave'));
    `)

    console.log("✅ Check constraint updated successfully!")
  } catch (err: any) {
    console.error("❌ Failed to update check constraint:", err.message || err)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
