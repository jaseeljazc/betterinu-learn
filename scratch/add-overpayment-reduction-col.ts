import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const client = new Client(process.env.NEON_DATABASE_URL!)
  await client.connect()

  console.log("Adding overpayment_reduction column to student_installments...")
  
  await client.query(`
    ALTER TABLE student_installments 
    ADD COLUMN IF NOT EXISTS overpayment_reduction NUMERIC(12,2) NOT NULL DEFAULT 0;
  `)
  
  await client.query(`
    COMMENT ON COLUMN student_installments.overpayment_reduction 
    IS 'Amount by which this installment was reduced due to overpayment cascade from a previous installment';
  `)

  console.log("Successfully added overpayment_reduction column.")
  await client.end()
}

main().catch(console.error)
