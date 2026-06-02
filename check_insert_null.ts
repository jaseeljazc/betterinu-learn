import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const adminId = 'b9b5a921-9caf-4457-8da7-ddcb09880af1'; // Jaseel dev
  try {
    const rows = await sql`
      INSERT INTO tasks (
        title, type, status, priority, visibility,
        created_by, assigned_by, assigned_to
      ) VALUES (
        'Test null assignedTo', 'task', 'todo', 'medium', 'public',
        ${adminId}, null, null
      ) RETURNING id;
    `;
    console.log("Success:", rows);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
