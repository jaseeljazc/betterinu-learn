/**
 * Fix: Replace partial index with full UNIQUE constraint
 * Usage: npx tsx scripts/fix-attendance-constraint.ts
 */
import { Client } from "@neondatabase/serverless";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL not set");

  const client = new Client(url);
  await client.connect();

  try {
    console.log("Dropping partial index...");
    await client.query(`DROP INDEX IF EXISTS uniq_attendance_fine`);
    
    console.log("Creating full UNIQUE constraint...");
    await client.query(`
      CREATE UNIQUE INDEX uniq_attendance_fine 
      ON student_leave_fines (attendance_id)
    `);
    
    console.log("✅ Constraint fixed successfully");
    
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
