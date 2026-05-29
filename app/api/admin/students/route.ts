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
      s.profile_image_url, s.created_at,
      COUNT(sc.id)::int AS course_count
    FROM students s
    LEFT JOIN student_courses sc ON sc.student_id = s.id
    GROUP BY s.id, s.name, s.email, s.student_type, s.is_active, s.profile_image_url, s.created_at
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

  // 1. Generate password
  const password = generatePassword();

  // 2. Create Firebase user
  let firebaseUid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });
    firebaseUid = userRecord.uid;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Firebase error";
    return NextResponse.json({ error: msg }, { status: 422 });
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
        is_active
      )
      VALUES (
        ${name},
        ${email},
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
        TRUE
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
  try {
    await sendWelcomeEmail({ name, email, password });
    emailSent = true;
  } catch (err) {
    console.error("Welcome email failed:", err);
  }

  return NextResponse.json({ ok: true, studentId, emailSent }, { status: 201 });
}
