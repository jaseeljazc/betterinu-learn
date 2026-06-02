import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL!);

async function main() {
  console.log("Checking admin roles before deletion...");
  const before = await sql`SELECT id, name FROM admin_roles WHERE name IN ('admin', 'support')`;
  console.log("Roles found:", before);

  if (before.length === 0) {
    console.log("No admin or support roles found to delete.");
    return;
  }

  const instructorRows = await sql`SELECT id FROM admin_roles WHERE name = 'instructor'`;
  if (instructorRows.length === 0) {
    throw new Error("Instructor role not found!");
  }
  const instructorId = instructorRows[0].id;
  console.log("Instructor role ID:", instructorId);

  // Re-home the accounts' legacy role_id column
  console.log("1. Updating admin_accounts.role_id for legacy roles...");
  const updateAccounts = await sql`
    UPDATE admin_accounts
    SET role_id = ${instructorId}
    WHERE role_id IN (SELECT id FROM admin_roles WHERE name IN ('admin', 'support'))
  `;
  console.log("Updated admin_accounts rows:", updateAccounts);

  // Re-home in the pivot table (if any only have the deprecated roles)
  console.log("2. Re-homing pivot table roles...");
  const rehomeAccounts = await sql`
    SELECT aar.admin_account_id
    FROM admin_account_roles aar
    JOIN admin_roles ar ON ar.id = aar.role_id
    WHERE ar.name IN ('admin', 'support')
      AND NOT EXISTS (
        SELECT 1
        FROM admin_account_roles aar2
        JOIN admin_roles ar2 ON ar2.id = aar2.role_id
        WHERE aar2.admin_account_id = aar.admin_account_id
          AND ar2.name NOT IN ('admin', 'support')
      )
  `;
  console.log("Accounts that only had admin/support:", rehomeAccounts);

  for (const acc of rehomeAccounts) {
    console.log(`Assigning instructor role to account ${acc.admin_account_id} in pivot table...`);
    await sql`
      INSERT INTO admin_account_roles (admin_account_id, role_id)
      VALUES (${acc.admin_account_id}, ${instructorId})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log("3. Deleting admin_account_roles for 'admin' and 'support'...");
  const delAar = await sql`
    DELETE FROM admin_account_roles
    WHERE role_id IN (SELECT id FROM admin_roles WHERE name IN ('admin', 'support'))
  `;
  console.log("Deleted admin_account_roles count:", delAar);

  console.log("4. Deleting admin_role_permissions for 'admin' and 'support'...");
  const delArp = await sql`
    DELETE FROM admin_role_permissions
    WHERE role_id IN (SELECT id FROM admin_roles WHERE name IN ('admin', 'support'))
  `;
  console.log("Deleted admin_role_permissions count:", delArp);

  console.log("5. Deleting roles from admin_roles...");
  const delAr = await sql`
    DELETE FROM admin_roles
    WHERE name IN ('admin', 'support')
  `;
  console.log("Deleted admin_roles count:", delAr);

  console.log("Checking admin roles after deletion...");
  const after = await sql`SELECT id, name FROM admin_roles WHERE name IN ('admin', 'support')`;
  console.log("Roles found after:", after);
}

main().catch(console.error);
