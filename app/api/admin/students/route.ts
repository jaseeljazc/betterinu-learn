import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { adminAuth } from "@/lib/firebase-admin";
import { sendWelcomeEmail } from "@/lib/email";
import { generatePassword } from "@/lib/password";

/**
 * GET /api/admin/students — list all students with assigned course count
 */
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT
      s.id, s.name, s.email, s.created_at,
      COUNT(sc.id)::int AS course_count
    FROM students s
    LEFT JOIN student_courses sc ON sc.student_id = s.id
    GROUP BY s.id, s.name, s.email, s.created_at
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ students: rows });
}

/**
 * POST /api/admin/students — create a student
 * Body: { name: string, email: string }
 *
 * 1. Generate secure password
 * 2. Create Firebase Auth user
 * 3. Insert into students table
 * 4. Send welcome email with credentials
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { name, email } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "name and email are required" }, { status: 400 });

  // 1. Generate password
  const password = generatePassword();

  // 2. Create Firebase user
  let firebaseUid: string;
  try {
    const userRecord = await adminAuth.createUser({ email, password, displayName: name });
    firebaseUid = userRecord.uid;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Firebase error";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // 3. Insert student row
  let studentId: string;
  try {
    const rows = await sql`
      INSERT INTO students (name, email, firebase_uid)
      VALUES (${name}, ${email}, ${firebaseUid})
      RETURNING id
    `;
    studentId = rows[0].id as string;
  } catch (err: unknown) {
    // Roll back Firebase user if DB insert fails
    await adminAuth.deleteUser(firebaseUid).catch(() => {});
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 4. Send welcome email (non-fatal)
  try {
    await sendWelcomeEmail({ name, email, password });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }

  return NextResponse.json({ ok: true, studentId }, { status: 201 });
}
