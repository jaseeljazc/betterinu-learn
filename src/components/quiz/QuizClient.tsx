"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Course, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProgressDots } from "./ProgressDots";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";

export function QuizClient({ course, week }: { course: Course; week: Week }) {
  const quiz = week.quiz;
  const { state, currentQuestion, score, selectOption, next, submit, reset } = useQuiz(quiz);
  const { progress, saveQuizResult } = useProgress();
  const selected = state.selected[currentQuestion.id];
  const isLast = state.currentIndex === quiz.questions.length - 1;
  const passed = score >= quiz.passingScore;
  const attemptNumber =
    progress.quizResults.filter((result) => result.courseId === course.id && result.weekId === week.id).length + 1;

  function finishQuiz() {
    saveQuizResult({
      courseId: course.id,
      weekId: week.id,
      score,
      totalQuestions: quiz.questions.length,
      passed,
      attemptNumber,
      completedAt: new Date().toISOString(),
    });
    submit();
  }

  if (state.isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <QuizResult quiz={quiz} score={score} selected={state.selected} onRetry={reset} />
        <div className="mt-6 flex justify-center">
          {passed ? (
            <Link className={buttonClasses()} href={`/course/${course.id}/learn`}>
              Continue Learning
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-xl border border-default bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="course">{course.title}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold">{week.title.replace(":", "")} Quiz</h1>
          </div>
          <Badge variant="xp">12:34 remaining</Badge>
        </div>
        <div className="mt-5">
          <ProgressDots active={state.currentIndex} total={quiz.questions.length} />
        </div>
      </header>

      <QuizQuestion
        index={state.currentIndex}
        onSelect={(optionIndex) => selectOption(currentQuestion.id, optionIndex)}
        question={currentQuestion}
        selected={selected}
        total={quiz.questions.length}
      />

      {selected !== undefined ? (
        <div className="flex justify-end">
          <Button onClick={isLast ? finishQuiz : next} type="button">
            {isLast ? "Submit Quiz" : "Next Question"}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
