/**
 * scripts/run-migration-029.ts
 * Creates student_leave_requests table.
 * Run with: npx tsx scripts/run-migration-029.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
CREATE TABLE IF NOT EXISTS student_leave_requests (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date         DATE         NOT NULL,
  reason       TEXT         NOT NULL,
  status       TEXT         NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  UUID         REFERENCES admin_accounts(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  admin_note   TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_slr_student_id ON student_leave_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_slr_status     ON student_leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_slr_date       ON student_leave_requests (date);
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 029: student_leave_requests table...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'student_leave_requests'
    `)
    if (result.rows.length > 0) {
      console.log("✅ student_leave_requests table verified in DB.")
    } else {
      console.error("❌ Table NOT created!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
