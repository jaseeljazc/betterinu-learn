import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { buildTaskWhereClause } from './src/lib/task-permissions';

const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  const user = {
    id: '2e2ed7d5-aafa-4114-ba1e-753c18d8acbb', // Praveen (developer)
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

  const visibility = buildTaskWhereClause(user, 1, "t");

  try {
    const query = `
      SELECT t.id, t.task_id, t.title, t.department_id
      FROM tasks t
      WHERE t.parent_task_id IS NULL
        AND (${visibility.sql})
        AND t.department_id = $${visibility.params.length + 1}
    `;
    const params = [...visibility.params, '4d036640-ea87-4fcd-8463-4075d0f64b43'];

    const rows = await sql.query(query, params);
    console.log("Results:", rows);
  } catch (err) {
    console.error("Query failed:", err);
  }
}

main().catch(console.error);