import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function checkColumns() {
  try {
    const rows = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses'
    `;
    console.log("Columns in 'courses':", rows.map(r => r.column_name));
  } catch (err) {
    console.error("Error checking columns:", err);
  }
}

checkColumns();
