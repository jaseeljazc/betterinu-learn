import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  try {
    const obj = { id: "hello" };
    const res = await sql`
      INSERT INTO tasks (
        title, type, status, priority, visibility, created_by, assigned_to
      ) VALUES (
        'Test Task', 'task', 'todo', 'medium', 'public',
        '2b61ff6d-1bf9-450f-a9cb-b2e8ed7d885a',
        ${obj as any}
      )
    `;
    console.log("Insert with obj succeeded");
  } catch (e: any) {
    console.log("Insert with obj failed:", e.message);
  }
}
main().catch(console.error);
