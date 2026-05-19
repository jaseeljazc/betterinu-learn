import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  console.log("Adding columns using standard template literals...");
  try {
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS leave_count INT NOT NULL DEFAULT 0;`;
    console.log("leave_count added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS absent_count INT NOT NULL DEFAULT 0;`;
    console.log("absent_count added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS half_day_count INT NOT NULL DEFAULT 0;`;
    console.log("half_day_count added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_leaves INT NOT NULL DEFAULT 0;`;
    console.log("lop_leaves added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_absences INT NOT NULL DEFAULT 0;`;
    console.log("lop_absences added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_full_days INT NOT NULL DEFAULT 0;`;
    console.log("lop_full_days added");
    
    await sql`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_half_days NUMERIC(10,1) NOT NULL DEFAULT 0;`;
    console.log("lop_half_days added");
    
    console.log("Success!");
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

run();
