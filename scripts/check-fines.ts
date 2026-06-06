import { sql } from "@/lib/db";

(async () => {
  console.log("\n=== Student Leave Fines ===");
  const fines = await sql`SELECT * FROM student_leave_fines ORDER BY created_at DESC LIMIT 10`;
  console.log(JSON.stringify(fines, null, 2));

  console.log("\n=== Fine Settings ===");
  const settings = await sql`SELECT value FROM app_settings WHERE key = 'student_leave_fine' LIMIT 1`;
  console.log(JSON.stringify(settings, null, 2));
})();
