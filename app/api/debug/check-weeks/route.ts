import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Check how many weeks exist per course
    const weekCounts = await sql`
      SELECT course_id, COUNT(*) as week_count 
      FROM course_weeks 
      GROUP BY course_id
    `;

    // Get all courses and check if they have curriculum_backup data
    const courses = await sql`
      SELECT id, title, 
        CASE 
          WHEN curriculum_backup IS NOT NULL THEN jsonb_array_length(curriculum_backup)
          ELSE 0 
        END as backup_week_count
      FROM courses
    `;

    return NextResponse.json({
      course_weeks_table: weekCounts,
      courses_with_backup: courses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
