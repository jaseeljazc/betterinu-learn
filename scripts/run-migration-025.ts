/**
 * scripts/run-migration-025.ts
 * Applies migrations/025_update_roles.sql then re-seeds all role permissions.
 * Run with: npx tsx scripts/run-migration-025.ts
 */
import { sql } from "../src/lib/db"
import { readFileSync } from "fs"
import { join } from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: join(process.cwd(), ".env.local") })

async function main() {
  console.log("Applying migration 025_update_roles.sql…")

  const file = readFileSync(
    join(process.cwd(), "migrations", "025_update_roles.sql"),
    "utf8"
  )

  // Split on semicolons, skip comment-only or blank blocks
  const statements = file
    .split(";")
    .map((s) => s.trim())
    .filter((s) => {
      const nonComment = s
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim()
      return nonComment.length > 0
    })

  let ok = 0
  let failed = 0

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt + ";")
      ok++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`  ✗ Failed: ${stmt.slice(0, 100).replace(/\n/g, " ")}`)
      console.error(`    ${msg}`)
      failed++
    }
  }

  console.log(`\nMigration done: ${ok} statements OK, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
