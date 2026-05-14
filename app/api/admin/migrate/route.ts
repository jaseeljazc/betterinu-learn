import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * POST /api/admin/migrate?secret=<MIGRATE_SECRET>
 * Applies safe, idempotent ALTER TABLE migrations.
 */
export async function POST(req: NextRequest) {
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

  return NextResponse.json({ ok: true, results });
}
