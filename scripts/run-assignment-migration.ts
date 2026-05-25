import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function run() {
  console.log("Running assignment migration...");
  await sql`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id   TEXT        NOT NULL,
      student_id      UUID        NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
      course_id       TEXT        NOT NULL REFERENCES courses(id)   ON DELETE CASCADE,
      week_id         TEXT        NOT NULL,
      day_id          TEXT        NOT NULL,
      submitted_text  TEXT        NOT NULL,
      submitted_at    TIMESTAMP   DEFAULT NOW(),
      status          TEXT        DEFAULT 'pending',
      feedback        TEXT,
      reviewed_at     TIMESTAMP,
      reviewed_by     UUID        REFERENCES admin_accounts(id),
      UNIQUE(assignment_id, student_id)
    )
  `;
  console.log("✓ assignment_submissions table created (or already exists).");
}

run().catch((e) => { console.error(e); process.exit(1); });
