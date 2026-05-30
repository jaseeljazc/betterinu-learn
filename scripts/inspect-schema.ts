import fs from "fs"
import path from "path"
import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(__dirname, "../.env.local") })

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL
  if (!dbUrl) throw new Error("NEON_DATABASE_URL is not set in .env.local")

  const client = new Client(dbUrl)
  await client.connect()

  const tables = ["student_courses", "courses", "account_transactions", "students"]

  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table])
    console.log(`\n=== ${table} (${res.rows.length} columns) ===`)
    for (const row of res.rows) {
      console.log(`  ${row.column_name} | ${row.data_type} | default: ${row.column_default ?? "none"} | nullable: ${row.is_nullable}`)
    }
  }

  // Also check if student_courses has a primary key
  const pk = await client.query(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_type
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'student_courses'
      AND tc.constraint_type = 'PRIMARY KEY'
  `)
  console.log(`\n=== student_courses PRIMARY KEY ===`)
  for (const row of pk.rows) {
    console.log(`  PK column: ${row.column_name}`)
  }

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
