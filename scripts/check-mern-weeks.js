require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.NEON_DATABASE_URL);

async function main() {
  const rows = await sql`
    SELECT constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_name = 'course_weeks'
  `;
  console.log(rows);
}

main().catch(e => { console.error(e.message); process.exit(1); });
