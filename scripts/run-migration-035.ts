/**
 * scripts/run-migration-035.ts
 * Creates institution_events table.
 * Run with: npx tsx scripts/run-migration-035.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
CREATE TABLE IF NOT EXISTS institution_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT         NOT NULL,
  description TEXT,
  date        DATE         NOT NULL,
  time        TEXT,
  location    TEXT,
  created_by  UUID         REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_events_date ON institution_events (date);
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 035: creating institution_events table...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'institution_events'
    `)
    if (result.rows.length > 0) {
      console.log("✅ institution_events table verified.")
    } else {
      console.error("❌ institution_events table was NOT created!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
