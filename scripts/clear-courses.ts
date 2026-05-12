import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

async function clearCourses() {
  console.log("Clearing courses table (and cascading to student_courses, etc)...");
  
  await sql`TRUNCATE TABLE courses CASCADE`;
  
  console.log("✓ All courses cleared successfully.");
}

clearCourses().catch((err) => {
  console.error("Failed to clear courses:", err);
  process.exit(1);
});
