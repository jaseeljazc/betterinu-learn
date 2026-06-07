import { sql } from "../src/lib/db";

async function main() {
  console.log("=== Step 1: Fix leave_request_id NOT NULL constraint ===\n");

  // The column must be nullable since admin-direct Leave marks have no leave_request_id
  try {
    await sql`ALTER TABLE student_leave_fines ALTER COLUMN leave_request_id DROP NOT NULL`;
    console.log("✅ leave_request_id is now nullable");
  } catch (e: any) {
    console.log("ℹ️  leave_request_id:", e.message);
  }

  console.log("\n=== Step 2: Backfill fines for all existing admin-marked Leave/Absent rows ===\n");

  const settingsRows = await sql`SELECT value FROM app_settings WHERE key = 'student_leave_fines' LIMIT 1`;
  const fs = settingsRows[0]?.value as any;
  console.log("Settings:", JSON.stringify(fs), "\n");

  const fine_period = fs.fine_period ?? "monthly";
  const free_leaves = fs.free_leaves_per_period ?? 2;
  const periodFormat = fine_period === "monthly" ? "YYYY-MM" : "YYYY";

  const unfinedRows = await sql`
    SELECT sa.id AS attendance_id, sa.student_id, sa.date::text AS date, sa.status
    FROM student_attendance sa
    WHERE sa.status IN ('Leave', 'Absent')
      AND sa.marked_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM student_leave_fines f WHERE f.attendance_id = sa.id
      )
    ORDER BY sa.student_id, sa.date
  `;
  console.log(`Found ${unfinedRows.length} attendance row(s) with no fine yet.\n`);

  for (const row of unfinedRows as any[]) {
    const { attendance_id, student_id, date, status } = row;
    const [year, month] = date.split("-");
    const periodLabel = fine_period === "monthly" ? `${year}-${month}` : year;

    if (status === "Absent" && fs.absent_fine_enabled) {
      await sql`
        INSERT INTO student_leave_fines
          (student_id, attendance_id, fine_type, period_label, fine_amount, status)
        VALUES
          (${student_id}, ${attendance_id}, 'absent', ${date}, ${fs.absent_fine_amount}, 'pending')
        ON CONFLICT DO NOTHING
      `;
      console.log(`  ✅ Absent fine: ${date} | ₹${fs.absent_fine_amount} | student ${student_id}`);
    }

    if (status === "Leave" && fs.enabled) {
      const leaveReqRows = await sql`
        SELECT COUNT(*) AS count FROM student_leave_requests
        WHERE student_id = ${student_id}
          AND status = 'approved'
          AND TO_CHAR(date, ${periodFormat}) = ${periodLabel}
      `;
      const directLeaveRows = await sql`
        SELECT COUNT(*) AS count FROM student_attendance
        WHERE student_id = ${student_id}
          AND status = 'Leave'
          AND id != ${attendance_id}
          AND TO_CHAR(date, ${periodFormat}) = ${periodLabel}
      `;
      const totalLeaves = Number(leaveReqRows[0].count) + Number(directLeaveRows[0].count) + 1;

      if (totalLeaves > free_leaves) {
        await sql`
          INSERT INTO student_leave_fines
            (student_id, attendance_id, fine_type, period_label, fine_amount, status)
          VALUES
            (${student_id}, ${attendance_id}, 'leave', ${periodLabel}, ${fs.fine_amount}, 'pending')
          ON CONFLICT DO NOTHING
        `;
        console.log(`  ✅ Leave fine: ${date} | period:${periodLabel} | total:${totalLeaves}/${free_leaves} | ₹${fs.fine_amount} | student ${student_id}`);
      } else {
        console.log(`  SKIP Leave (within quota): ${date} | total:${totalLeaves}/${free_leaves} | student ${student_id}`);
      }
    }
  }

  console.log("\n=== Final fines in DB ===");
  const allFines = await sql`
    SELECT f.id, s.name, f.fine_type, f.period_label, f.fine_amount, f.status, f.attendance_id
    FROM student_leave_fines f
    JOIN students s ON s.id = f.student_id
    ORDER BY s.name, f.created_at
  `;
  for (const f of allFines as any[]) {
    console.log(`  ${f.name.padEnd(25)} | ${f.fine_type.padEnd(7)} | ${f.period_label} | ₹${f.fine_amount} | ${f.status} | att:${f.attendance_id ?? "-"}`);
  }
  console.log(`\nTotal fines: ${allFines.length}`);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
