import { Client } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const client = new Client(process.env.NEON_DATABASE_URL!)
  await client.connect()

  console.log("Altering chk_installment_amounts constraint...")
  
  await client.query(`
    ALTER TABLE student_installments 
    DROP CONSTRAINT IF EXISTS chk_installment_amounts;
  `)
  
  await client.query(`
    ALTER TABLE student_installments 
    ADD CONSTRAINT chk_installment_amounts 
    CHECK (total_amount >= 0 AND paid_amount >= 0 AND paid_amount <= total_amount);
  `)

  console.log("Successfully updated constraint to allow total_amount >= 0.")
  await client.end()
}

main().catch(console.error)
