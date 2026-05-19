import { sql } from './src/lib/db';
async function run() {
  const role = await sql`SELECT * FROM admin_roles WHERE id = '2cab1820-54f3-4816-9640-001404e93296'`;
  console.log('Role:', role);
  
  const permissions = await sql`SELECT p.* FROM permissions p JOIN admin_role_permissions arp ON p.id = arp.permission_id WHERE arp.role_id = '2cab1820-54f3-4816-9640-001404e93296'`;
  console.log('Permissions:', permissions);
}
run();
