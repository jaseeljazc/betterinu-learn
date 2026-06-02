import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  // Get all roles with their permissions, focused on tasks_mgmt
  const rows = await sql`
    SELECT ar.name AS role, p.action
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE p.module = 'tasks_mgmt' OR p.id IS NULL
    ORDER BY ar.name, p.action
  `;
  // Group by role
  const byRole: Record<string, string[]> = {};
  for (const r of rows) {
    if (!byRole[r.role]) byRole[r.role] = [];
    if (r.action) byRole[r.role].push(r.action);
  }
  console.log(JSON.stringify(byRole, null, 2));
}
main().catch(console.error);
