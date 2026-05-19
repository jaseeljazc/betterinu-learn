import { sql } from '../src/lib/db';

async function run() {
  try {
    const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs'`;
    console.log("res:", res);
    process.exit(0);
  } catch (err) {
    console.error("error:", err);
    process.exit(1);
  }
}

run();
