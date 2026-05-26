const { config } = require('dotenv');
config({ path: '.env.local' });
const { sql } = require('./src/lib/db');

async function run() {
  const res = await sql`SELECT id, full_name, qualification FROM employees ORDER BY created_at DESC LIMIT 5`;
  console.log(res);
}
run();
