/**
 * scripts/run-migration-031.ts
 * - Convert Early_Checkout rows to Half_Day
 * - Update status CHECK constraint (remove Early_Checkout)
 * - Add fine_type + attendance_id to student_leave_fines
 * - Replace UNIQUE on leave_request_id with two partial indexes
 * Run with: npx tsx scripts/run-migration-031.ts
 */
import { Client } from "@neondatabase/serverless";
import { join } from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: join(process.cwd(), ".env.local") });

const SQL = `
-- 1. Convert existing Early_Checkout rows
UPDATE student_attendance SET status = 'Half_Day' WHERE status = 'Early_Checkout';

-- 2. Update status CHECK constraint
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_status_check;
ALTER TABLE student_attendance
  ADD CONSTRAINT student_attendance_status_check
  CHECK (status IN ('Present', 'Late', 'Half_Day', 'Absent', 'Holiday', 'Leave'));

-- 3. Add fine_type and attendance_id columns
ALTER TABLE student_leave_fines
  ADD COLUMN IF NOT EXISTS fine_type TEXT NOT NULL DEFAULT 'leave'
    CHECK (fine_type IN ('leave', 'absent')),
  ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES student_attendance(id) ON DELETE SET NULL;

-- 4. Replace old UNIQUE constraint with partial indexes
ALTER TABLE student_leave_fines DROP CONSTRAINT IF EXISTS student_leave_fines_leave_request_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fine_leave_request
  ON student_leave_fines (leave_request_id)
  WHERE fine_type = 'leave' AND leave_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fine_attendance
  ON student_leave_fines (attendance_id)
  WHERE fine_type = 'absent' AND attendance_id IS NOT NULL;
`;

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local");

  console.log("Connecting to database...");
  const client = new Client(url);
  await client.connect();

  try {
    console.log("Running migration 031: attendance overhaul...");
    await client.query(SQL);
    console.log("✅ Migration executed.");

    const r = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'student_leave_fines' AND column_name = 'fine_type'
    `);
    console.log(r.rows.length > 0
      ? "✅ fine_type column verified."
      : "❌ fine_type column NOT found!"
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err);
  process.exit(1);
});
