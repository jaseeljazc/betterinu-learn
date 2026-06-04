import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * GET /api/student/courses/:courseId
 * Returns a specific course assigned to the authenticated student from the DB.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { courseId } = await params;

  const rows = await sql`
    SELECT 
      c.id, c.title, c.tagline, c.description, c.instructor, c.instructor_bio,
      c.duration, c.total_modules, c.level, c.color, c.icon, c.outcomes, c.is_active, c.curriculum, c.image
    FROM student_courses sc
    JOIN courses c ON c.id = sc.course_id
    WHERE sc.student_id = ${student.studentId} AND c.id = ${courseId} AND c.is_active = true
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const r = rows[0];

  // Map to Course type structure (camelCase)
  const formattedCourse = {
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
  };

  return NextResponse.json({
    course: formattedCourse,
  });
}
