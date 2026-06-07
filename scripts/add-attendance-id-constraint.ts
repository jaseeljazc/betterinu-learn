/**
 * Add UNIQUE constraint on attendance_id to fix ON CONFLICT error
 * Usage: npx tsx scripts/add-attendance-id-constraint.ts
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
    console.log("Adding UNIQUE constraint on attendance_id...");
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_fine 
      ON student_leave_fines (attendance_id) 
      WHERE attendance_id IS NOT NULL
    `);
    
    console.log("✅ UNIQUE constraint added successfully");
    
    // Verify
    const result = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'student_leave_fines' 
        AND indexname = 'uniq_attendance_fine'
    `);
    
    if (result.rows.length > 0) {
      console.log("\n✅ Constraint verified:");
      console.log(result.rows[0].indexdef);
    }
    
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
