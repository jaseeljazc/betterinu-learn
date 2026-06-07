/**
 * Fix period_label for leave fines to show actual dates
 * Usage: npx tsx scripts/fix-leave-fine-dates.ts
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
    console.log("Checking leave fines with period labels...");
    
    // Find leave fines with period format (YYYY-MM or YYYY)
    const result = await client.query(`
      SELECT 
        slf.id,
        slf.fine_type,
        slf.period_label,
        sa.date AS attendance_date,
        slr.date AS leave_request_date
      FROM student_leave_fines slf
      LEFT JOIN student_attendance sa ON slf.attendance_id = sa.id
      LEFT JOIN student_leave_requests slr ON slf.student_leave_request = slr.id
      WHERE slf.fine_type = 'leave'
        AND slf.period_label ~ '^[0-9]{4}-[0-9]{2}$|^[0-9]{4}$'
      ORDER BY slf.created_at DESC
      LIMIT 20
    `);

    console.log(`\nFound ${result.rows.length} leave fines with period labels:\n`);
    
    let fixed = 0;
    for (const row of result.rows) {
      const correctDate = row.attendance_date || row.leave_request_date;
      if (correctDate) {
        console.log(`  Fixing: ${row.period_label} → ${correctDate}`);
        await client.query(
          `UPDATE student_leave_fines SET period_label = $1 WHERE id = $2`,
          [correctDate, row.id]
        );
        fixed++;
      } else {
        console.log(`  ⚠️  Cannot fix ${row.id}: no date found`);
      }
    }

    console.log(`\n✅ Fixed ${fixed} leave fine dates`);
    
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
