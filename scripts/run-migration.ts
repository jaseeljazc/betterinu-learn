import fs from "fs"
import path from "path"
import { sql } from "../src/lib/db"

async function main() {
  const file = path.join(__dirname, "../migrations/006_rbac.sql")
  const content = fs.readFileSync(file, "utf-8")
  
  console.log("Running migration 006_rbac.sql...")
  
  const statements = content.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    
  for (const stmt of statements) {
    try {
      await sql.query(stmt)
      console.log('Executed statement successfully.')
    } catch (e) {
      console.error('Failed to execute statement:', stmt)
      throw e
    }
  }

  console.log("Migration completed successfully.")
  process.exit(0)
}

main().catch(err => {
  console.error("Migration failed:", err)
  process.exit(1)
})
