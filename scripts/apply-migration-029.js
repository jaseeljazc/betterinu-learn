/**
 * scripts/apply-migration-029.js
 * Applies migration 029: renames courses.curriculum → curriculum_backup
 * and adds idx_course_weeks_position index.
 *
 * Run once:
 *   node scripts/apply-migration-029.js
 */

const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const sql = neon(process.env.NEON_DATABASE_URL);

async function main() {
  const migrationSql = fs.readFileSync(
    path.join(__dirname, "../migrations/029_drop_curriculum_column.sql"),
    "utf8"
  );

  console.log("Applying migration 029…");

  // Split on statement boundaries and run sequentially
  const statements = migrationSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    console.log("  →", stmt.slice(0, 80).replace(/\s+/g, " "), "…");
    await sql.unsafe(`${stmt};`);
  }

  console.log("Migration 029 applied successfully ✅");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
