/**
 * scripts/run-migration-016.ts
 * Applies migrations/016_sync_permissions.sql to the database.
 * Run with: npx dotenv-cli -e .env.local -- npx tsx scripts/run-migration-016.ts
 */
import { sql } from "../src/lib/db"
import { readFileSync } from "fs"
import { join } from "path"

async function main() {
  console.log("Applying migration 016_sync_permissions.sql…")

  const file = readFileSync(
    join(process.cwd(), "migrations", "016_sync_permissions.sql"),
    "utf8"
  )

  // Split on semicolons, skip comment-only lines and blanks
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
      console.error(`  ✗ Failed: ${stmt.slice(0, 80).replace(/\n/g, " ")}`)
      console.error(`    ${msg}`)
      failed++
    }
  }

  console.log(`\nDone: ${ok} statements OK, ${failed} failed.`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
