import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/migrate?secret=<MIGRATE_SECRET>
 * Applies safe, idempotent ALTER TABLE migrations. (Convenience for browser)
 */
export async function GET(req: NextRequest) {
  return handleMigration(req);
}

/**
 * POST /api/admin/migrate?secret=<MIGRATE_SECRET>
 * Applies safe, idempotent ALTER TABLE migrations.
 */
export async function POST(req: NextRequest) {
  return handleMigration(req);
}

async function handleMigration(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== (process.env.MIGRATE_SECRET ?? "betterinu-migrate-2024")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: string[] = [];

  try {
    await sql`ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_files JSONB`;
    results.push("✓ assignment_submissions.submitted_files");
  } catch (e: any) {
    results.push(`✗ assignment_submissions.submitted_files: ${e.message}`);
  }

  try {
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_state JSONB`;
    results.push("✓ students.progress_state");
  } catch (e: any) {
    results.push(`✗ students.progress_state: ${e.message}`);
  }

  // ── Standalone Assignment System (completely separate from curriculum) ────────

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS standalone_assignments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title            TEXT NOT NULL,
        instructions     TEXT DEFAULT '',
        due_date         TIMESTAMPTZ,
        total_marks      INT,
        allowed_submission_types JSONB DEFAULT '["text"]'::jsonb,
        attached_files   JSONB DEFAULT '[]'::jsonb,
        reference_links  JSONB DEFAULT '[]'::jsonb,
        scope            TEXT NOT NULL DEFAULT 'course',
        course_id        TEXT REFERENCES courses(id) ON DELETE CASCADE,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    results.push("✓ standalone_assignments table");
  } catch (e: any) {
    results.push(`✗ standalone_assignments: ${e.message}`);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS standalone_assignment_student (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES standalone_assignments(id) ON DELETE CASCADE,
        student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        assigned_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (assignment_id, student_id)
      )
    `;
    results.push("✓ standalone_assignment_student table");
  } catch (e: any) {
    results.push(`✗ standalone_assignment_student: ${e.message}`);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS standalone_assignment_submissions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES standalone_assignments(id) ON DELETE CASCADE,
        student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        submitted_text TEXT DEFAULT '',
        submitted_files JSONB DEFAULT '[]'::jsonb,
        submitted_at  TIMESTAMPTZ DEFAULT NOW(),
        status        TEXT NOT NULL DEFAULT 'pending',
        feedback      TEXT,
        reviewed_at   TIMESTAMPTZ,
        reviewed_by   UUID,
        UNIQUE (assignment_id, student_id)
      )
    `;
    results.push("✓ standalone_assignment_submissions table");
  } catch (e: any) {
    results.push(`✗ standalone_assignment_submissions: ${e.message}`);
  }

  return NextResponse.json({ ok: true, results });
}
