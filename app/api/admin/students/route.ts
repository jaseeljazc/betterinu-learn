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
      s.id, s.name, s.email, s.student_type, s.is_active,
      s.profile_image_url, s.created_at, s.temp_password,
      COUNT(sc.id)::int AS course_count
    FROM students s
    LEFT JOIN student_courses sc ON sc.student_id = s.id
    GROUP BY s.id, s.name, s.email, s.student_type, s.is_active, s.profile_image_url, s.created_at, s.temp_password
    ORDER BY s.created_at DESC
  `;

  return NextResponse.json({ students: rows });
}

/**
 * POST /api/admin/students — create a student with full profile
 *
 * Required: name, email
 * Optional: phone, date_of_birth, gender, address, student_type,
 *           profile_image_url, emergency_contact_*, and all academic fields
 *
 * Flow:
 *   1. Generate secure password
 *   2. Create Firebase Auth user
 *   3. Insert into students (with all new columns)
 *   4. Upsert student_profiles row (trigger already seeds it, but we update it)
 *   5. Send welcome email (non-fatal)
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    email,
    phone,
    date_of_birth,
    gender,
    address,
    student_type,
    profile_image_url,
    emergency_contact_name,
    emergency_contact_relation,
    emergency_contact_phone,
    // Academic profile (all optional)
    highest_qualification,
    current_status,
    year_of_passing,
    certification_url,
    id_proof_url,
  } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Generate password
  const password = generatePassword();

  // 2. Create Firebase user (or recover/link orphan user)
  let firebaseUid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
      emailVerified: false,
    });
    firebaseUid = userRecord.uid;
  } catch (err: any) {
    if (err && err.code === "auth/email-already-exists") {
      // Check if they exist in the DB
      const existingDb = await sql`SELECT id FROM students WHERE email = ${normalizedEmail}`;
      if (existingDb.length > 0) {
        return NextResponse.json(
          { error: "The email address is already in use by another account." },
          { status: 409 }
        );
      }

      // If they exist in Firebase Auth but NOT in the PostgreSQL DB (orphan),
      // we reuse the Firebase user: update their password/display name and proceed!
      try {
        const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
        await adminAuth.updateUser(existingUser.uid, {
          password,
          displayName: name,
        });
        firebaseUid = existingUser.uid;
      } catch (recoveryErr: any) {
        const msg = recoveryErr instanceof Error ? recoveryErr.message : "Firebase recovery error";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } else {
      const msg = err instanceof Error ? err.message : "Firebase error";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  // 2.5 Generate unique student code
  const currentYear = new Date().getFullYear();
  let studentCode: string = "";
  let uniqueCode = false;
  while (!uniqueCode) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    studentCode = `STU-${currentYear}-${random}`;
    const check = await sql`SELECT id FROM students WHERE student_code = ${studentCode}`;
    if (check.length === 0) uniqueCode = true;
  }

  // 3. Insert student row (all new columns included)
  let studentId: string;
  try {
    const rows = await sql`
      INSERT INTO students (
        name,
        email,
        firebase_uid,
        phone,
        date_of_birth,
        gender,
        address,
        student_type,
        profile_image_url,
        emergency_contact_name,
        emergency_contact_relation,
        emergency_contact_phone,
        is_active,
        temp_password,
        student_code
      )
      VALUES (
        ${name},
        ${normalizedEmail},
        ${firebaseUid},
        ${phone ?? null},
        ${date_of_birth ?? null},
        ${gender ?? null},
        ${address ?? null},
        ${student_type ?? null},
        ${profile_image_url ?? null},
        ${emergency_contact_name ?? null},
        ${emergency_contact_relation ?? null},
        ${emergency_contact_phone ?? null},
        TRUE,
        ${password},
        ${studentCode}
      )
      RETURNING id
    `;
    studentId = rows[0].id as string;
  } catch (err: unknown) {
    // Roll back Firebase user if DB insert fails
    await adminAuth.deleteUser(firebaseUid).catch(() => {});
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 4. Upsert student_profiles with any provided academic data
  // The trigger already inserts a blank row; we only UPDATE if there is data.
  const hasProfileData =
    highest_qualification ||
    current_status ||
    year_of_passing ||
    certification_url ||
    id_proof_url;

  if (hasProfileData) {
    try {
      await sql`
        INSERT INTO student_profiles (
          student_id,
          highest_qualification,
          current_status,
          year_of_passing,
          certification_url,
          id_proof_url
        )
        VALUES (
          ${studentId},
          ${highest_qualification ?? null},
          ${current_status ?? null},
          ${year_of_passing ?? null},
          ${certification_url ?? null},
          ${id_proof_url ?? null}
        )
        ON CONFLICT (student_id) DO UPDATE SET
          highest_qualification = EXCLUDED.highest_qualification,
          current_status        = EXCLUDED.current_status,
          year_of_passing       = EXCLUDED.year_of_passing,
          certification_url     = EXCLUDED.certification_url,
          id_proof_url          = EXCLUDED.id_proof_url,
          updated_at            = NOW()
      `;
    } catch (err) {
      // Profile upsert failure is non-fatal — student was created
      console.error("student_profiles upsert failed:", err);
    }
  }

  // 5. Send welcome email (non-fatal)
  let emailSent = false;
  let tempPassword: string | null = null;
  try {
    await sendWelcomeEmail({ name, email: normalizedEmail, password });
    emailSent = true;
  } catch (err) {
    console.error("Welcome email failed:", err);
    tempPassword = password;
  }

  return NextResponse.json({ ok: true, studentId, emailSent, tempPassword }, { status: 201 });
}
