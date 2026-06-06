/**
 * scripts/run-migration-030.ts
 * Creates student_leave_fines table.
 * Run with: npx tsx scripts/run-migration-030.ts
 */
import { Client } from "@neondatabase/serverless";
import { join } from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: join(process.cwd(), ".env.local") });

const SQL = `
CREATE TABLE IF NOT EXISTS student_leave_fines (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leave_request_id UUID        NOT NULL REFERENCES student_leave_requests(id) ON DELETE CASCADE,
  period_label     TEXT        NOT NULL,
  fine_amount      NUMERIC     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'waived')),
  waive_reason     TEXT,
  resolved_by      UUID        REFERENCES admin_accounts(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (leave_request_id)
);

CREATE INDEX IF NOT EXISTS idx_slf_student_id   ON student_leave_fines (student_id);
CREATE INDEX IF NOT EXISTS idx_slf_status        ON student_leave_fines (status);
CREATE INDEX IF NOT EXISTS idx_slf_period        ON student_leave_fines (period_label);
`;

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL is not set in .env.local");

  console.log("Connecting to database...");
  const client = new Client(url);
  await client.connect();

  try {
    console.log("Running migration 030: student_leave_fines table...");
    await client.query(SQL);
    console.log("✅ Migration executed.");

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'student_leave_fines'
    `);
    console.log(
      result.rows.length > 0
        ? "✅ student_leave_fines table verified in DB."
        : "❌ Table NOT created!"
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message || err);
  process.exit(1);
});
