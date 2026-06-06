/**
 * scripts/apply-migration-028.js
 * Applies migration 028 (course_weeks table) directly via the neon client.
 * Run with: node scripts/apply-migration-028.js
 */

const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL);

(async () => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS course_weeks (
        id          TEXT        NOT NULL,
        course_id   TEXT        REFERENCES courses(id) ON DELETE CASCADE,
        position    INT         NOT NULL,
        title       TEXT        NOT NULL,
        is_locked   BOOLEAN     DEFAULT false,
        is_shared   BOOLEAN     DEFAULT false,
        days        JSONB       NOT NULL DEFAULT '[]',
        quiz        JSONB,
        created_at  TIMESTAMPTZ DEFAULT now(),
        updated_at  TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (id, course_id)
      )
    `;
    console.log("✓ course_weeks table created (or already exists)");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_course_weeks_course_id
        ON course_weeks (course_id, position)
    `;
    console.log("✓ idx_course_weeks_course_id index created (or already exists)");

    console.log("\nMigration 028 applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
})();
