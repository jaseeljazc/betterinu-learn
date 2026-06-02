import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const user = {
    id: '2e2ed7d5-aafa-4114-ba1e-753c18d8acbb', // Praveen
    roles: ['developer'],
    permissions: [
      'courses:view',
      'curriculum:view',
      'tasks_mgmt:create',
      'tasks_mgmt:edit_own',
      'tasks_mgmt:manage_attachments',
      'tasks_mgmt:self_assign',
      'tasks_mgmt:view_own'
    ],
    departmentId: '4d036640-ea87-4fcd-8463-4075d0f64b43' // Engineering
  };

  const { buildTaskWhereClause } = require('../src/lib/task-permissions');
  const visibility = buildTaskWhereClause(user, 1, "t");

  console.log("visibility.sql:", visibility.sql);
  console.log("visibility.params:", visibility.params);

  try {
    // Construct the query text dynamically
    const queryText = `
      SELECT t.id, t.title
      FROM tasks t
      WHERE t.parent_task_id IS NULL
        AND (${visibility.sql})
      LIMIT 1
    `;

    // Call sql as a regular function passing the query string and params
    const rows = await sql.query(queryText, visibility.params);
    console.log("Success with regular function call:", rows);
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

main().catch(console.error);
