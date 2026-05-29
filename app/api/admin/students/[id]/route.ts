import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * GET /api/admin/students/[id]
 * Returns student detail, assigned courses, and per-course progress summary.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const [studentRows, assignedRows, progressRows] = await Promise.all([
    sql`
      SELECT s.*, 
        s.phone AS phone_number,
        s.date_of_birth AS dob,
        sp.highest_qualification, sp.current_status, sp.year_of_passing,
        sp.certification_url, sp.id_proof_url, sp.verification_status,
        sp.verified_by, sp.verified_at
      FROM students s
      LEFT JOIN student_profiles sp ON sp.student_id = s.id
      WHERE s.id = ${id}
    `,
    sql`
      SELECT sc.course_id, sc.assigned_at, c.title, c.level, c.duration, c.curriculum
      FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.student_id = ${id}
      ORDER BY sc.assigned_at
    `,
    sql`
      SELECT course_id, sub_module_id
      FROM student_progress
      WHERE student_id = ${id}
    `,
  ]);

  if (!studentRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Source 1: rows from student_progress table
  const progressMap: Record<string, Set<string>> = {};
  for (const row of progressRows) {
    const cid = row.course_id as string;
    if (!progressMap[cid]) progressMap[cid] = new Set();
    progressMap[cid].add(row.sub_module_id as string);
  }

  // Source 2: completedSubModules from progress_state JSONB blob
  // This captures lessons marked via the client-side progress hook
  const progressState = studentRows[0].progress_state as any;
  if (progressState?.completedSubModules && Array.isArray(progressState.completedSubModules)) {
    // Map each submodule ID back to its course by scanning the curricula
    const subModuleToCourse: Record<string, string> = {};
    for (const row of assignedRows) {
      const curriculum = (row.curriculum as any[]) || [];
      for (const week of curriculum) {
        for (const day of week.days || []) {
          for (const mod of day.subModules || []) {
            subModuleToCourse[mod.id] = row.course_id as string;
          }
        }
      }
    }

    for (const subModId of progressState.completedSubModules) {
      const cid = subModuleToCourse[subModId];
      if (cid) {
        if (!progressMap[cid]) progressMap[cid] = new Set();
        progressMap[cid].add(subModId);
      }
    }
  }

  // Strip curriculum from the response (large payload) but keep it for mapping
  return NextResponse.json({
    student: studentRows[0],
    courses: assignedRows.map((r) => {
      const ids = Array.from(progressMap[r.course_id as string] ?? []);
      return {
        course_id: r.course_id,
        assigned_at: r.assigned_at,
        title: r.title,
        level: r.level,
        duration: r.duration,
        curriculum: r.curriculum,   // keep for admin UI
        completedSubModules: ids.length,
        completedSubModuleIds: ids,
      };
    }),
  });
}

/**
 * DELETE /api/admin/students/[id]
 * Removes student from Firebase Auth and deletes from DB (cascades to all related rows).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;

  const rows = await sql`SELECT firebase_uid FROM students WHERE id = ${id}`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { firebase_uid } = rows[0];

  // Delete from Firebase (best-effort)
  if (firebase_uid) {
    try {
      await adminAuth.deleteUser(firebase_uid as string);
    } catch (err) {
      console.error("Firebase delete failed:", err);
    }
  }

  await sql`DELETE FROM students WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/admin/students/[id]
 * Updates a student's basic details and status.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const admin = await verifyAdminToken(token);
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    name,
    email,
    phone,
    phone_number,
    gender,
    date_of_birth,
    dob,
    address,
    student_code,
    enrollment_date,
    status,
    student_type,
    profile_image_url,
    emergency_contact_name,
    emergency_contact_relation,
    emergency_contact_phone,
    // Academic fields
    highest_qualification,
    current_status,
    year_of_passing,
    certification_url,
    id_proof_url,
    verification_status,
  } = body;

  const rows = await sql`SELECT firebase_uid FROM students WHERE id = ${id}`;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { firebase_uid } = rows[0];

  // 1. Update in Firebase if name changed
  if (name && firebase_uid) {
    try {
      await adminAuth.updateUser(firebase_uid as string, { displayName: name });
    } catch (err) {
      console.error("Firebase update failed:", err);
    }
  }

  const finalPhone = phone ?? phone_number;
  const finalDob = date_of_birth ?? dob;

  // 2. Update DB
  try {
    await sql`
      UPDATE students
      SET 
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email ?? null}, email),
        phone = ${finalPhone ?? null},
        phone_number = ${finalPhone ?? null},
        date_of_birth = ${finalDob ? new Date(finalDob) : null},
        dob = ${finalDob ? new Date(finalDob) : null},
        gender = ${gender ?? null},
        address = ${address ?? null},
        student_code = COALESCE(${student_code ?? null}, student_code),
        enrollment_date = ${enrollment_date ? new Date(enrollment_date) : null},
        status = COALESCE(${status ?? null}, status),
        student_type = ${student_type ?? null},
        profile_image_url = ${profile_image_url ?? null},
        emergency_contact_name = ${emergency_contact_name ?? null},
        emergency_contact_relation = ${emergency_contact_relation ?? null},
        emergency_contact_phone = ${emergency_contact_phone ?? null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // 3. Upsert student_profiles
    const verifiedBy = admin.adminId;

    await sql`
      INSERT INTO student_profiles (
        student_id,
        highest_qualification,
        current_status,
        year_of_passing,
        certification_url,
        id_proof_url,
        verification_status,
        verified_by,
        verified_at
      ) VALUES (
        ${id},
        ${highest_qualification ?? null},
        ${current_status ?? null},
        ${year_of_passing ? Number(year_of_passing) : null},
        ${certification_url ?? null},
        ${id_proof_url ?? null},
        'verified',
        ${verifiedBy},
        NOW()
      )
      ON CONFLICT (student_id) DO UPDATE SET
        highest_qualification = ${highest_qualification !== undefined ? (highest_qualification ?? null) : sql`student_profiles.highest_qualification`},
        current_status = ${current_status !== undefined ? (current_status ?? null) : sql`student_profiles.current_status`},
        year_of_passing = ${year_of_passing !== undefined ? (year_of_passing ? Number(year_of_passing) : null) : sql`student_profiles.year_of_passing`},
        certification_url = ${certification_url !== undefined ? (certification_url ?? null) : sql`student_profiles.certification_url`},
        id_proof_url = ${id_proof_url !== undefined ? (id_proof_url ?? null) : sql`student_profiles.id_proof_url`},
        updated_at = NOW()
    `;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Database update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
