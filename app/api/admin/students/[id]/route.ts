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
    sql`SELECT * FROM students WHERE id = ${id}`,
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
