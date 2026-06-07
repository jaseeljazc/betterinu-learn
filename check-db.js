require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.NEON_DATABASE_URL);

async function run() {
  const progress = await sql`SELECT * FROM student_progress WHERE student_id = 'SAVIYO-123'`;
  console.log("Progress for SAVIYO-123:", progress);
  sql.end();
}
run();
