import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  console.log("Creating payroll_runs table...");
  await sql`
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      month           VARCHAR(7) NOT NULL,
      working_days    INT NOT NULL DEFAULT 0,
      days_present    INT NOT NULL DEFAULT 0,
      total_absences  INT NOT NULL DEFAULT 0,
      lop_days        INT NOT NULL DEFAULT 0,
      daily_rate      NUMERIC(12,4) NOT NULL DEFAULT 0,
      lop_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,
      gross_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
      net_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
      status          VARCHAR(20) NOT NULL DEFAULT 'draft',
      disbursed_at    TIMESTAMPTZ,
      transaction_id  UUID REFERENCES account_transactions(id),
      created_by      UUID REFERENCES admin_accounts(id),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, month)
    );
  `;
  console.log("Table created!");

  // Insert permissions
  console.log("Inserting permissions...");
  await sql`
    INSERT INTO permissions (module, action, description)
    VALUES
      ('payroll_runs', 'view',   'View payroll runs and payslips'),
      ('payroll_runs', 'create', 'Generate and run payroll'),
      ('payroll_runs', 'edit',   'Approve / hold payroll runs'),
      ('payroll_runs', 'delete', 'Delete draft payroll runs')
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
      AND p.module = 'payroll_runs'
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
      AND p.module = 'payroll_runs'
      AND p.action IN ('view', 'create', 'edit')
    ON CONFLICT DO NOTHING;
  `;

  console.log("Done!");
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name = 'payroll_runs'
  `;
  console.log("Tables in DB now:", tables.map(t => t.table_name));
  
  process.exit(0);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
