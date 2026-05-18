/**
 * scripts/seed-account-manager.ts
 * Seeds account_categories (system), RBAC module + role for account_manager.
 * Run with: npx tsx scripts/seed-account-manager.ts
 * Fully idempotent — safe to re-run.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SYSTEM_CATEGORIES = {
  income: [
    { name: "Student Fees",  color: "#22c55e", icon: "GraduationCap" },
    { name: "Donations",     color: "#10b981", icon: "Heart" },
    { name: "Grants",        color: "#3b82f6", icon: "Award" },
    { name: "Refunds",       color: "#f59e0b", icon: "RotateCcw" },
  ],
  expense: [
    { name: "Salaries",        color: "#ef4444", icon: "Users" },
    { name: "Rent",            color: "#f97316", icon: "Building" },
    { name: "Utilities",       color: "#eab308", icon: "Zap" },
    { name: "Office Supplies", color: "#8b5cf6", icon: "Package" },
    { name: "Marketing",       color: "#ec4899", icon: "Megaphone" },
    { name: "Maintenance",     color: "#6366f1", icon: "Wrench" },
    { name: "Miscellaneous",   color: "#64748b", icon: "MoreHorizontal" },
  ],
};

const ACCOUNT_MANAGER_ROLE = {
  name: "account_manager",
  label: "Account Manager",
  description:
    "Full access to all account manager features. Cannot access student, course, or admin sections.",
  is_system: true,
};

const ACCOUNTS_ACTIONS = ["view", "create", "edit", "delete"] as const;

async function main() {
  console.log("Seeding Account Manager data…");
  
  const { sql } = await import("../src/lib/db");

  // 1. Seed system categories
  for (const [type, cats] of Object.entries(SYSTEM_CATEGORIES)) {
    for (const cat of cats) {
      await sql`
        INSERT INTO account_categories (name, type, color, icon, is_system)
        VALUES (${cat.name}, ${type}, ${cat.color}, ${cat.icon}, TRUE)
        ON CONFLICT DO NOTHING
      `;
    }
  }
  console.log("✓ System categories seeded");

  // 2. Seed accounts permissions
  for (const action of ACCOUNTS_ACTIONS) {
    const description = `Can ${action} accounts`;
    await sql`
      INSERT INTO permissions (module, action, description)
      VALUES ('accounts', ${action}, ${description})
      ON CONFLICT (module, action) DO NOTHING
    `;
  }
  console.log("✓ Accounts permissions seeded");

  // 3. Seed account_manager role
  await sql`
    INSERT INTO admin_roles (name, label, description, is_system)
    VALUES (
      ${ACCOUNT_MANAGER_ROLE.name},
      ${ACCOUNT_MANAGER_ROLE.label},
      ${ACCOUNT_MANAGER_ROLE.description},
      ${ACCOUNT_MANAGER_ROLE.is_system}
    )
    ON CONFLICT (name) DO NOTHING
  `;
  console.log("✓ account_manager role seeded");

  // 4. Assign all accounts permissions to account_manager role
  const roleRows = await sql`
    SELECT id FROM admin_roles WHERE name = 'account_manager'
  `;
  if (!roleRows.length) throw new Error("account_manager role not found after insert");
  const roleId = roleRows[0].id as string;

  for (const action of ACCOUNTS_ACTIONS) {
    const permRows = await sql`
      SELECT id FROM permissions WHERE module = 'accounts' AND action = ${action}
    `;
    if (!permRows.length) continue;
    const permId = permRows[0].id as string;
    await sql`
      INSERT INTO admin_role_permissions (role_id, permission_id)
      VALUES (${roleId}, ${permId})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log("✓ account_manager permissions linked");

  // 5. Also grant accounts permissions to super_admin and admin roles
  for (const roleName of ["super_admin", "admin"]) {
    const rRows = await sql`SELECT id FROM admin_roles WHERE name = ${roleName}`;
    if (!rRows.length) continue;
    const rId = rRows[0].id as string;
    for (const action of ACCOUNTS_ACTIONS) {
      const pRows = await sql`
        SELECT id FROM permissions WHERE module = 'accounts' AND action = ${action}
      `;
      if (!pRows.length) continue;
      await sql`
        INSERT INTO admin_role_permissions (role_id, permission_id)
        VALUES (${rId}, ${pRows[0].id})
        ON CONFLICT DO NOTHING
      `;
    }
  }
  console.log("✓ super_admin and admin granted accounts permissions");

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
