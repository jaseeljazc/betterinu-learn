import fs from "fs"
import path from "path"
import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(__dirname, "../.env.local") })

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) {
    throw new Error("NEON_DATABASE_URL is not set in .env.local")
  }

  const client = new Client(dbUrl)
  await client.connect()

  const file = path.join(__dirname, "../migrations/017_students_v2.sql")
  const content = fs.readFileSync(file, "utf-8")

  console.log("Running migration 017_students_v2.sql...")
  console.log("─".repeat(60))

  // Run the whole file as one transaction so it rolls back cleanly on error
  try {
    await client.query("BEGIN")
    await client.query(content)
    await client.query("COMMIT")
    console.log("\n✅ Migration 017 completed successfully.")
  } catch (e: any) {
    await client.query("ROLLBACK")
    console.error("\n❌ Migration failed — rolled back.", e.message)
    throw e
  } finally {
    await client.end()
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
