/**
 * scripts/run-migration-027.ts
 * Uses @neondatabase/serverless WebSocket Client (not HTTP neon()) for reliable DDL.
 * Run with: npx tsx scripts/run-migration-027.ts
 */
import { Client } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

const SQL = `
-- Drop old tables in correct order
DROP TABLE IF EXISTS attendance_notifications CASCADE;
DROP TABLE IF EXISTS attendance_punches CASCADE;
DROP TABLE IF EXISTS student_attendance CASCADE;

-- Unified student attendance table
CREATE TABLE student_attendance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'Present'
                  CHECK (status IN ('Present', 'Absent', 'Leave', 'Holiday')),
  punch_in        TIMESTAMPTZ,
  punch_out       TIMESTAMPTZ,
  punch_in_ip     TEXT,
  punch_out_ip    TEXT,
  is_trusted      BOOLEAN     NOT NULL DEFAULT FALSE,
  note            TEXT,
  marked_by       UUID        REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE INDEX idx_student_attendance_student_date
  ON student_attendance (student_id, date);

CREATE INDEX idx_student_attendance_date
  ON student_attendance (date);

CREATE INDEX idx_student_attendance_is_trusted
  ON student_attendance (is_trusted) WHERE is_trusted = FALSE;

-- Recreate attendance_notifications referencing the new table
CREATE TABLE attendance_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID        NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  attendance_id UUID        NOT NULL REFERENCES student_attendance(id) ON DELETE CASCADE,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message       TEXT        NOT NULL,
  action_url    TEXT,
  ip_address    TEXT        NOT NULL,
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_notifs_recipient
  ON attendance_notifications (recipient_id);

CREATE INDEX idx_attendance_notifs_unread
  ON attendance_notifications (recipient_id) WHERE is_read = FALSE;

COMMENT ON TABLE student_attendance IS 'Unified student attendance: one row per student per day. Punch data filled by student; status/note overrideable by admin.';
COMMENT ON COLUMN student_attendance.marked_by IS 'NULL = auto from punch. Non-null = admin override.';
`

async function main() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  console.log("Connecting to database...")
  const client = new Client(url)
  await client.connect()

  try {
    console.log("Running migration 027: unified student_attendance table...")
    await client.query(SQL)
    console.log("✅ Migration executed.")

    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('student_attendance', 'attendance_notifications', 'attendance_punches')
      ORDER BY table_name
    `)
    console.log("\nTables in database:")
    result.rows.forEach((r: any) => console.log(`  ✓ ${r.table_name}`))

    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'student_attendance'
      ORDER BY ordinal_position
    `)
    if (cols.rows.length > 0) {
      console.log("\nstudent_attendance columns:")
      cols.rows.forEach((c: any) => console.log(`  - ${c.column_name}`))
    } else {
      console.log("\n❌ student_attendance was NOT created!")
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err)
  process.exit(1)
})
