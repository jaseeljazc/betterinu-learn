import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  console.log("Creating table using template literal...");
  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date        DATE NOT NULL,
      status      VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Leave', 'Holiday')),
      note        TEXT,
      marked_by   UUID REFERENCES admin_accounts(id),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, date)
    );
  `;
  console.log("Table created!");

  // Insert permissions
  console.log("Inserting permissions...");
  await sql`
    INSERT INTO permissions (module, action, description)
    VALUES
      ('attendance', 'view',   'View attendance records'),
      ('attendance', 'create', 'Mark / create attendance records'),
      ('attendance', 'edit',   'Edit existing attendance records'),
      ('attendance', 'delete', 'Delete attendance records')
    ON CONFLICT (module, action) DO NOTHING;
  `;
  console.log("Permissions inserted!");

  // Grant to super_admin + admin
  console.log("Granting permissions to super_admin and admin...");
  await sql`
    INSERT INTO admin_role_permissions (role_id, permission_id)
    SELECT ar.id, p.id
    FROM admin_roles ar
    CROSS JOIN permissions p
    WHERE ar.name IN ('super_admin', 'admin')
      AND p.module = 'attendance'
    ON CONFLICT DO NOTHING;
  `;
  
  // Grant to account_manager
  console.log("Granting permissions to account_manager...");
  await sql`
    INSERT INTO admin_role_permissions (role_id, permission_id)
    SELECT ar.id, p.id
    FROM admin_roles ar
    CROSS JOIN permissions p
    WHERE ar.name = 'account_manager'
      AND p.module = 'attendance'
      AND p.action = 'view'
    ON CONFLICT DO NOTHING;
  `;

  // Grant to instructor
  console.log("Granting permissions to instructor...");
  await sql`
    INSERT INTO admin_role_permissions (role_id, permission_id)
    SELECT ar.id, p.id
    FROM admin_roles ar
    CROSS JOIN permissions p
    WHERE ar.name = 'instructor'
      AND p.module = 'attendance'
      AND p.action IN ('view', 'create')
    ON CONFLICT DO NOTHING;
  `;

  console.log("Done!");
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log("Tables in DB now:", tables.map(t => t.table_name));
  
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
