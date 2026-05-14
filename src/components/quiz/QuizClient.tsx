"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, Lock } from "lucide-react";
import type { Course, Week } from "@/types";
import { useProgress } from "@/lib/hooks/useProgress";
import { useQuiz } from "@/lib/hooks/useQuiz";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressDots } from "./ProgressDots";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";

export function QuizClient({ 
  course, 
  week, 
  quizData, 
  moduleId, 
  moduleTitle 
}: { 
  course: Course; 
  week: Week; 
  quizData: any; 
  moduleId: string; 
  moduleTitle: string;
}) {
  const { state, currentQuestion, score, totalQuestions, selectOption, next, submit, reset } = useQuiz(quizData);
  const { progress, saveQuizResult, areAllWeekDaysComplete } = useProgress();
  const selected = state.selected[currentQuestion?.id];
  const isLast = state.currentIndex === totalQuestions - 1;
  const passingScore = quizData?.passingScore || Math.ceil(totalQuestions * 0.8); // Default 80%
  const passed = score >= passingScore;
  const attemptNumber =
    progress.quizResults.filter((result) => result.courseId === course.id && result.weekId === week.id).length + 1;

  function finishQuiz() {
    saveQuizResult({
      courseId: course.id,
      weekId: week.id,
      score,
      totalQuestions,
      passed,
      attemptNumber,
      completedAt: new Date().toISOString(),
    });
    submit();
  }



  if (totalQuestions === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="font-display text-2xl font-bold mb-4">Quiz Under Construction</h2>
        <p className="text-secondary mb-8">This quiz has no questions yet.</p>
        <Link className={buttonVariants()} href={`/course/${course.id}/learn`}>
          Go Back
        </Link>
      </div>
    );
  }

  if (state.isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl pb-24">
        <QuizResult quiz={quizData} score={score} selected={state.selected} onRetry={reset} passingScore={passingScore} />
        <div className="mt-8 flex flex-col items-center gap-4">
          {passed ? (
            <Link className={buttonVariants({ size: "lg", className: "w-full max-w-xs" })} href={`/course/${course.id}/learn`}>
              Continue Learning 
              <ArrowRight className="size-4 ml-2" aria-hidden />
            </Link>
          ) : (
            <Link className={buttonVariants({ variant: "secondary", className: "w-full max-w-xs" })} href={`/course/${course.id}/learn`}>
              Back to Curriculum
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="rounded-xl border border-default bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="bg-[#1a4031] text-white">{course.title}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold">{moduleTitle}</h1>
          </div>
          <Link href={`/course/${course.id}/learn`} className="text-secondary hover:text-foreground transition-colors p-2 -mr-2" title="Exit Quiz">
             <ArrowRight className="rotate-180 size-5" />
          </Link>
        </div>
        <div className="mt-5">
          <ProgressDots active={state.currentIndex} total={totalQuestions} />
        </div>
      </header>

      <QuizQuestion
        index={state.currentIndex}
        onSelect={(answer) => selectOption(currentQuestion.id, answer)}
        question={currentQuestion}
        selected={selected}
        total={totalQuestions}
      />

      {selected !== undefined && selected.trim() !== "" ? (
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
