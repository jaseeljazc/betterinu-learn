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
      SELECT id FROM students WHERE firebase_uid = ${decoded.uid} LIMIT 1
    `;
    if (!rows.length) return null;
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
