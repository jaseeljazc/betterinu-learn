import fs from "fs"
import path from "path"
import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(__dirname, "../.env.local") })

async function runMigrationFile(client: Client, filename: string) {
  const file = path.join(__dirname, "../migrations", filename)
  if (!fs.existsSync(file)) {
    console.log(`⚠️ Migration file ${filename} not found, skipping.`)
    return
  }
  const content = fs.readFileSync(file, "utf-8")
  console.log(`Running migration ${filename}...`)
  
  try {
    await client.query("BEGIN")
    await client.query(content)
    await client.query("COMMIT")
    console.log(`✅ Migration ${filename} completed successfully.\n`)
  } catch (e: any) {
    await client.query("ROLLBACK")
    console.error(`❌ Migration ${filename} failed — rolled back. Error:`, e.message)
    throw e
  }
}

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error("NEON_DATABASE_URL or DATABASE_URL is not set in .env.local")
  }

  const client = new Client(dbUrl)
  await client.connect()

  try {
    await runMigrationFile(client, "021_multi_role.sql")
    await runMigrationFile(client, "022_tasks.sql")
    await runMigrationFile(client, "023_tasks_permissions.sql")
  } finally {
    await client.end()
  }
}

main().catch(console.error)
