import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/courses
 * Returns the list of courses assigned to the authenticated student from the DB.
 */
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization")) ?? req.cookies.get("__session")?.value ?? "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const rows = await sql`
    SELECT 
      c.id, c.title, c.tagline, c.description, c.instructor, c.instructor_bio,
      c.duration, c.total_modules, c.level, c.color, c.icon, c.outcomes, c.is_active, c.curriculum, c.image
    FROM student_courses sc
    JOIN courses c ON c.id = sc.course_id
    WHERE sc.student_id = ${student.studentId} AND c.is_active = true
    ORDER BY sc.assigned_at
  `;

  // Map to Course type structure (camelCase)
  const formattedCourses = rows.map(r => ({
    id: r.id,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    instructor: r.instructor,
    instructorBio: r.instructor_bio,
    duration: r.duration,
    totalModules: r.total_modules,
    level: r.level,
    color: r.color,
    icon: r.icon,
    outcomes: r.outcomes || [],
    weeks: r.curriculum || [],
    image: r.image,
  }));

  return NextResponse.json({
    courseIds: formattedCourses.map((c) => c.id),
    courses: formattedCourses,
  });
}
