/**
 * scripts/seed-courses.ts
 *
 * Populates the `courses` table from the hardcoded TypeScript array.
 * Only metadata is seeded — week/day/subModule content stays in TypeScript.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-courses.ts
 */
import { neon } from "@neondatabase/serverless";
import { courses } from "../src/lib/data/courses";

const sql = neon(process.env.NEON_DATABASE_URL!);

async function seed() {
  console.log("Seeding courses table...\n");

  for (const c of courses) {
    await sql`
      INSERT INTO courses (
        id, title, tagline, description,
        instructor, instructor_bio, duration,
        total_modules, level, color, icon, outcomes, curriculum
      )
      VALUES (
        ${c.id},
        ${c.title},
        ${c.tagline},
        ${c.description},
        ${c.instructor},
        ${c.instructorBio},
        ${c.duration},
        ${c.totalModules},
        ${c.level},
        ${c.color},
        ${c.icon},
        ${JSON.stringify(c.outcomes)},
        ${JSON.stringify(c.weeks)}
      )
      ON CONFLICT (id) DO UPDATE SET
        title          = EXCLUDED.title,
        tagline        = EXCLUDED.tagline,
        description    = EXCLUDED.description,
        instructor     = EXCLUDED.instructor,
        instructor_bio = EXCLUDED.instructor_bio,
        duration       = EXCLUDED.duration,
        total_modules  = EXCLUDED.total_modules,
        level          = EXCLUDED.level,
        color          = EXCLUDED.color,
        icon           = EXCLUDED.icon,
        outcomes       = EXCLUDED.outcomes,
        curriculum     = EXCLUDED.curriculum
    `;
    console.log(`✓  ${c.id.padEnd(12)} ${c.title}`);
  }

  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
