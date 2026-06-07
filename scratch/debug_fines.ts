import { sql } from "../src/lib/db";

async function main() {
  console.log("\n=== 1. FINE SETTINGS (app_settings) ===");
  const settings = await sql`
    SELECT key, value FROM app_settings
    WHERE key IN ('student_leave_fines', 'student_attendance')
  `;
  for (const row of settings) {
    console.log(`\nkey: ${row.key}`);
    console.log(JSON.stringify(row.value, null, 2));
  }

  console.log("\n=== 2. ALL STUDENTS ===");
  const students = await sql`SELECT id, name, email FROM students ORDER BY created_at DESC LIMIT 10`;
  for (const s of students) {
    console.log(`  [${s.id}] ${s.name} (${s.email})`);
  }

  console.log("\n=== 3. RECENT ATTENDANCE (last 30 rows) ===");
  const att = await sql`
    SELECT sa.id, s.name, sa.date, sa.status, sa.marked_by
    FROM student_attendance sa
    JOIN students s ON s.id = sa.student_id
    ORDER BY sa.date DESC, sa.created_at DESC
    LIMIT 30
  `;
  for (const r of att) {
    console.log(`  ${r.name} | ${r.date} | ${r.status} | marked_by: ${r.marked_by ?? "auto"} | id: ${r.id}`);
  }

  console.log("\n=== 4. ALL FINES IN student_leave_fines ===");
  const fines = await sql`
    SELECT f.id, s.name, f.fine_type, f.period_label, f.fine_amount, f.status, f.attendance_id, f.leave_request_id, f.created_at
    FROM student_leave_fines f
    JOIN students s ON s.id = f.student_id
    ORDER BY f.created_at DESC
    LIMIT 30
  `;
  if (fines.length === 0) {
    console.log("  ⚠️  NO FINES FOUND AT ALL in student_leave_fines table");
  } else {
    for (const f of fines) {
      console.log(`  [${f.id}] ${f.name} | ${f.fine_type} | ${f.period_label} | ₹${f.fine_amount} | ${f.status} | att:${f.attendance_id ?? "-"} | lr:${f.leave_request_id ?? "-"}`);
    }
  }

  console.log("\n=== 5. ON CONFLICT CHECK — unique constraint on student_leave_fines ===");
  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'student_leave_fines'::regclass
  `;
  for (const c of constraints) {
    console.log(`  ${c.conname} [${c.contype}]: ${c.def}`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
