import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  console.log("Applying migrations manually...");
  
  try {
    console.log("Altering attendance check constraint...");
    await sql`ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;`;
    await sql`ALTER TABLE attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('Present', 'Absent', 'Leave', 'Half_Day', 'Holiday'));`;
    console.log("Attendance constraint updated.");
  } catch (e) {
    console.error("Constraint error:", e);
  }

  try {
    console.log("Dropping old columns...");
    await sql`ALTER TABLE payroll_runs DROP COLUMN IF EXISTS total_absences;`;
    await sql`ALTER TABLE payroll_runs DROP COLUMN IF EXISTS lop_days;`;
    console.log("Old columns dropped.");
  } catch (e) {
    console.error("Drop error:", e);
  }

  const columnsToAdd = [
    { name: "leave_count", type: "INT NOT NULL DEFAULT 0" },
    { name: "absent_count", type: "INT NOT NULL DEFAULT 0" },
    { name: "half_day_count", type: "INT NOT NULL DEFAULT 0" },
    { name: "lop_leaves", type: "INT NOT NULL DEFAULT 0" },
    { name: "lop_absences", type: "INT NOT NULL DEFAULT 0" },
    { name: "lop_full_days", type: "INT NOT NULL DEFAULT 0" },
    { name: "lop_half_days", type: "NUMERIC(10,1) NOT NULL DEFAULT 0" }
  ];

  for (const col of columnsToAdd) {
    try {
      console.log(`Adding column ${col.name}...`);
      await sql.unsafe(`ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
      console.log(`Column ${col.name} added.`);
    } catch (e) {
      console.error(`Error adding column ${col.name}:`, e);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

run().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
