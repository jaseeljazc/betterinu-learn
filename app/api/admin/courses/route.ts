import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/admin/courses — list all courses from DB
 */
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`SELECT * FROM courses ORDER BY created_at DESC`;
  return NextResponse.json({ courses: rows });
}

/**
 * POST /api/admin/courses
 * Create a new course
 */
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id, title, tagline, description, instructor, instructor_bio,
      duration, total_modules, level, color, icon, outcomes, is_active, curriculum
    } = body;

    if (!id || !title) {
      return NextResponse.json({ error: "ID and Title are required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO courses (
        id, title, tagline, description, instructor, instructor_bio,
        duration, total_modules, level, color, icon, outcomes, is_active, curriculum
      ) VALUES (
        ${id}, ${title}, ${tagline ?? ""}, ${description ?? ""}, ${instructor ?? ""}, ${instructor_bio ?? ""},
        ${duration ?? ""}, ${total_modules ?? 0}, ${level ?? "Beginner"}, ${color ?? "--course-default"}, 
        ${icon ?? "Book"}, ${JSON.stringify(outcomes ?? [])}, ${is_active ?? true}, ${JSON.stringify(curriculum ?? [])}
      ) RETURNING *
    `;

    return NextResponse.json({ course: rows[0] });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: "A course with this ID already exists." }, { status: 400 });
    }
    console.error("Failed to create course:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
