import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function run() {
  try {
    console.log("Altering employees table...");
    await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS qualification VARCHAR(100)`;
    await sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'`;
    console.log("✅ Successfully altered employees table.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}

run();
