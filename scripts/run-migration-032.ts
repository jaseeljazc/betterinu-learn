/**
 * scripts/run-migration-032.ts
 * Adds marks_obtained column to both submission tables.
 * Run with: npx tsx scripts/run-migration-032.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
ALTER TABLE standalone_assignment_submissions 
ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(4,1) DEFAULT NULL 
CHECK (marks_obtained >= 0 AND marks_obtained <= 10);

ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS marks_obtained NUMERIC(4,1) DEFAULT NULL 
CHECK (marks_obtained >= 0 AND marks_obtained <= 10);
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 032: adding marks_obtained columns...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    // Verify
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'standalone_assignment_submissions'
        AND column_name = 'marks_obtained'
    `)
    if (result.rows.length > 0) {
      console.log("✅ marks_obtained column verified in standalone_assignment_submissions.")
    } else {
      console.error("❌ marks_obtained column was NOT added!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
