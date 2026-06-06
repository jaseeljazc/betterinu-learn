/**
 * scripts/run-migration-033.ts
 * Adds started_at column to students table.
 * Run with: npx tsx scripts/run-migration-033.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
ALTER TABLE students
ADD COLUMN IF NOT EXISTS started_at DATE NULL;
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 033: adding started_at column to students...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    // Verify
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'students'
        AND column_name = 'started_at'
    `)
    if (result.rows.length > 0) {
      console.log("✅ started_at column verified in students table.")
    } else {
      console.error("❌ started_at column was NOT added!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
