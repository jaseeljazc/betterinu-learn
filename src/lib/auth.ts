/**
 * lib/auth.ts — Token verification helpers (server-side only).
 *
 * Verifies a Firebase ID token AND confirms the uid exists in the
 * correct DB table (admins or students). Returns null if either check fails.
 */
import { adminAuth } from "./firebase-admin";
import { sql } from "./db";

export async function verifyStudentToken(token: string) {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const rows = await sql`
      SELECT id, status FROM students WHERE firebase_uid = ${decoded.uid} LIMIT 1
    `;
    if (!rows.length) return null;
    if (rows[0].status === "inactive") return null;
    return { studentId: rows[0].id as string, uid: decoded.uid };
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string) {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const rows = await sql`
      SELECT id FROM admin_accounts WHERE firebase_uid = ${decoded.uid} LIMIT 1
    `;
    if (!rows.length) return null;
    return { adminId: rows[0].id as string, uid: decoded.uid };
  } catch {
    return null;
  }
}

/** Extract Bearer token from an Authorization header. */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/**
 * Verify if an admin has a specific permission based on their role.
 * @param token Firebase ID token
 * @param module Permission module (e.g., 'students')
 * @param action Permission action (e.g., 'read', 'create', 'update', 'delete')
 * @returns true if the admin has the permission, false otherwise
 */
export async function verifyAdminPermission(
  token: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    if (process.env.SUPER_ADMIN_UID && process.env.SUPER_ADMIN_UID === uid) {
      return true;
    }

    const rows = await sql`
      SELECT 1 FROM admin_accounts aa
      JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
      JOIN admin_roles ar ON ar.id = aar.role_id
      JOIN admin_role_permissions arp ON arp.role_id = ar.id
      JOIN permissions p ON p.id = arp.permission_id
      WHERE aa.firebase_uid = ${uid}
        AND aa.status = 'active'
        AND p.module = ${module}
        AND p.action = ${action}
      LIMIT 1
    `;

    return rows.length > 0;
  } catch {
    return false;
  }
}
