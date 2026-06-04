/**
 * scripts/run-migration-028.ts
 * Creates app_settings table and seeds the default student_attendance settings.
 * Run with: npx tsx scripts/run-migration-028.ts
 */
import { Client } from "@neondatabase/serverless"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
CREATE TABLE IF NOT EXISTS app_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(100) NOT NULL,
  key         VARCHAR(200) NOT NULL UNIQUE,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES admin_accounts(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the default student attendance settings row if not exists
INSERT INTO app_settings (category, key, value, description)
VALUES (
  'student_attendance',
  'student_attendance',
  '{
    "work_start_time": "09:00",
    "work_end_time": "18:00",
    "grace_period_minutes": 15,
    "late_after_minutes": 15,
    "half_day_min_hours": 4,
    "auto_absent_if_no_punchin": true,
    "weekend_days": ["sunday"]
  }'::jsonb,
  'Controls how student punch-in times are classified into Present / Late / Half Day / Early Checkout'
)
ON CONFLICT (key) DO NOTHING;
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 028: app_settings table...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'app_settings'
    `)
    if (result.rows.length > 0) {
      console.log("✅ app_settings table verified in DB.")
    } else {
      console.error("❌ app_settings table was NOT created!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
