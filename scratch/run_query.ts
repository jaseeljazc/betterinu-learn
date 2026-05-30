import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })
import { Client } from "@neondatabase/serverless"

async function main() {
  const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error("Neither NEON_DATABASE_URL nor DATABASE_URL was found in environment.")
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  console.log("Connected to Neon DB successfully")

  const query = `
    SELECT
      spl.id,
      spl.amount_paid,
      spl.payment_date,
      spl.payment_mode,
      spl.reference_number,
      spl.entry_type,
      spl.recorded_by,
      si.installment_number,
      si.total_amount,
      si.due_date,
      sc.payment_type,
      s.name,
      c.title AS course_name
    FROM student_payment_logs spl
    JOIN student_installments si ON si.id = spl.installment_id
    JOIN student_courses sc ON sc.id = spl.enrollment_id
    JOIN students s ON s.id = spl.student_id
    JOIN courses c ON c.id::text = sc.course_id
    LIMIT 1;
  `

  try {
    const res = await client.query(query)
    console.log("=== MAIN QUERY RESULT ===")
    console.log(JSON.stringify(res.rows, null, 2))

    if (res.rows.length === 0) {
      console.log("\n=== MAIN QUERY RETURNED ZERO ROWS, RUNNING INDIVIDUAL COUNTS ===")
      const tables = ["student_payment_logs", "student_installments", "student_courses", "students", "courses"]
      for (const t of tables) {
        const countRes = await client.query(`SELECT COUNT(*)::int as count FROM ${t}`)
        console.log(`${t}: ${countRes.rows[0].count} rows`)
      }
    }
  } catch (err: any) {
    console.log("=== QUERY ERROR ===")
    console.error(err)
  }

  await client.end()
}

main().catch(console.error)
