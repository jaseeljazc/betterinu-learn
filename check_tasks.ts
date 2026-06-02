import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'tasks'
    ORDER BY ordinal_position
  `;
  console.log('Tasks columns:', JSON.stringify(cols, null, 2));

  // Let's also test a mock insert.
  try {
    const res = await sql`
      INSERT INTO tasks (
        title, type, status, priority, visibility, created_by, assigned_to
      ) VALUES (
        'Test Task', 'task', 'todo', 'medium', 'public',
        '2b61ff6d-1bf9-450f-a9cb-b2e8ed7d885a', -- example id, maybe won't work
        '' -- passing empty string for assigned_to
      )
    `;
    console.log("Insert with '' succeeded");
  } catch (e: any) {
    console.log("Insert with '' failed:", e.message);
  }
}
main().catch(console.error);
