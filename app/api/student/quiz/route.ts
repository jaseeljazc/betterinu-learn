import { NextRequest, NextResponse } from "next/server";
import { extractToken, verifyStudentToken } from "@/lib/auth";
import { sql } from "@/lib/db";

/**
 * POST /api/student/quiz
 * Grades the quiz against curriculum data.
 * DB persistence is optional — result is always returned even if DB is unavailable.
 */
export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { moduleId, courseId, weekId, dayId, answers } = await req.json();

  if (!moduleId || !courseId || !weekId || !dayId || !answers) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Load the course curriculum to grade against
  let curriculum: any[] = [];
  try {
    const rows = await sql`SELECT curriculum FROM courses WHERE id = ${courseId} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    curriculum = rows[0].curriculum as any[];
  } catch (err) {
    console.error("Failed to load curriculum:", err);
    return NextResponse.json({ error: "Failed to load course" }, { status: 500 });
  }

  // Find the quiz submodule
  let quizModule: any = null;
  for (const week of curriculum) {
    if (week.id !== weekId) continue;
    for (const day of (week.days || [])) {
      if (day.id !== dayId) continue;
      for (const mod of (day.subModules || [])) {
        if (mod.id === moduleId && mod.type === "quiz") {
          quizModule = mod;
          break;
        }
      }
    }
  }

  if (!quizModule?.quizData) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { questions = [], maxAttempts } = quizModule.quizData;

  // ── Grade (always runs, regardless of DB) ──
  let score = 0;
  const totalMarks = questions.length;
  const results: any[] = [];

  for (const q of questions) {
    const given = answers[q.id];
    let correct = false;

    if (q.type === "mcq") {
      // answers send index as number; ensure type-safe comparison
      correct = given !== undefined && Number(given) === Number(q.correctIndex);
    } else if (q.type === "text") {
      correct =
        typeof given === "string" &&
        given.trim().toLowerCase() === (q.correctText || "").trim().toLowerCase();
    }

    if (correct) score += 1;

    results.push({
      questionId: q.id,
      correct,
      selectedAnswer: given,
      explanation: q.explanation || null,
    });
  }

  const passed = totalMarks > 0 && score === totalMarks;

  // ── Optional DB persist (fail silently if table not yet created) ──
  let attemptCount = 1;
  try {
    const attemptRows = await sql`
      SELECT COUNT(*) as cnt FROM quiz_results
      WHERE module_id = ${moduleId} AND student_id = ${student.studentId} AND course_id = ${courseId}
    `;
    attemptCount = parseInt(attemptRows[0]?.cnt ?? "0") + 1;

    if (maxAttempts && attemptCount > maxAttempts) {
      return NextResponse.json({ error: "Max attempts reached" }, { status: 403 });
    }

    await sql`
      INSERT INTO quiz_results
        (module_id, student_id, course_id, week_id, day_id, score, total_marks, passed, attempt_number, answers, results)
      VALUES
        (${moduleId}, ${student.studentId}, ${courseId}, ${weekId}, ${dayId},
         ${score}, ${totalMarks}, ${passed}, ${attemptCount},
         ${JSON.stringify(answers)}::jsonb, ${JSON.stringify(results)}::jsonb)
    `;
  } catch (err) {
    console.warn("Quiz DB save skipped (run migrations/005_quiz_assignment_system.sql):", (err as any)?.message);
  }

  // ── Optional: mark progress if passed ──
  if (passed) {
    try {
      await sql`
        INSERT INTO student_progress (student_id, course_id, week_id, day_id, sub_module_id)
        VALUES (${student.studentId}, ${courseId}, ${weekId}, ${dayId}, ${moduleId})
        ON CONFLICT (student_id, course_id, week_id, day_id, sub_module_id) DO NOTHING
      `;
    } catch (err) {
      console.warn("Progress insert skipped:", (err as any)?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    result: {
      submitted: true,
      score,
      totalMarks,
      passed,
      results,
      attemptCount,
    },
  });
}

/**
 * GET /api/student/quiz?moduleId=xxx&courseId=xxx
 * Returns the latest quiz attempt result for the current student.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");
  const courseId = searchParams.get("courseId");

  if (!moduleId || !courseId) {
    return NextResponse.json({ error: "Missing moduleId or courseId" }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT * FROM quiz_results
      WHERE module_id = ${moduleId} AND student_id = ${student.studentId} AND course_id = ${courseId}
      ORDER BY attempt_number DESC
      LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ result: null });

    const row = rows[0];
    return NextResponse.json({
      result: {
        submitted: true,
        score: row.score,
        totalMarks: row.total_marks,
        passed: row.passed,
        results: row.results,
        attemptCount: row.attempt_number,
      },
    });
  } catch (_) {
    // Table might not exist yet
    return NextResponse.json({ result: null });
  }
}
