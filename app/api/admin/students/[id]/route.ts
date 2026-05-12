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
    sql`SELECT id, name, email, created_at FROM students WHERE id = ${id}`,
    sql`
      SELECT sc.course_id, sc.assigned_at, c.title, c.level, c.duration
      FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.student_id = ${id}
      ORDER BY sc.assigned_at
    `,
    sql`
      SELECT course_id, COUNT(*)::int AS completed
      FROM student_progress
      WHERE student_id = ${id}
      GROUP BY course_id
    `,
  ]);

  if (!studentRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const progressMap: Record<string, number> = {};
  for (const row of progressRows) {
    progressMap[row.course_id as string] = row.completed as number;
  }

  return NextResponse.json({
    student: studentRows[0],
    courses: assignedRows.map((r) => ({
      ...r,
      completedSubModules: progressMap[r.course_id as string] ?? 0,
    })),
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
