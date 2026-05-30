import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })
import { Client } from "@neondatabase/serverless"

async function main() {
  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL })
  await client.connect()
  console.log("Connected to Neon DB successfully")

  const tableColumns = {
    courses: ["one_time_price", "installment_total_price", "default_installment_count", "default_installment_amount", "grace_period_days"],
    student_courses: ["payment_type", "is_plan_customized", "custom_installment_count", "custom_installment_amount", "plan_start_date"],
    account_transactions: ["student_id", "enrollment_id", "installment_id"]
  }

  for (const [t, cols] of Object.entries(tableColumns)) {
    console.log(`\n=== Altered table: ${t} ===`)
    for (const col of cols) {
      const r = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
        [t, col]
      )
      if (r.rows.length > 0) {
        console.log(`  ${col} | ${r.rows[0].data_type}`)
      } else {
        console.log(`  ${col} | MISSING`)
      }
    }
  }

  await client.end()
}

main().catch(console.error)
