import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_runs'
    `;
    console.log("Columns of payroll_runs:", cols);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
