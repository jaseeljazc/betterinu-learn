"use client";

import { useState, useEffect } from "react";
import {
  HelpCircle, CheckCircle2, XCircle, RotateCcw, Trophy, ChevronRight, Loader2,
} from "lucide-react";
import type { QuizSubModuleData, QuizSubModuleQuestion } from "@/types";

interface QuizResult {
  questionId: string;
  correct: boolean;
  selectedAnswer: string | number;
  explanation?: string;
}

interface QuizState {
  answers: Record<string, string | number>; // questionId → answer
  submitted: boolean;
  score: number;
  totalMarks: number;
  passed: boolean;
  results: QuizResult[];
  attemptCount: number;
}



interface QuizViewerProps {
  moduleId: string;
  courseId: string;
  weekId: string;
  dayId: string;
  quizData: QuizSubModuleData;
  onPass?: () => void; // called when student passes; used to trigger progress mark
}

export function QuizViewer({ moduleId, courseId, weekId, dayId, quizData, onPass }: QuizViewerProps) {
  const [state, setState] = useState<QuizState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState("");

  const questions = quizData.questions || [];
  const maxAttempts = quizData.maxAttempts; // undefined = unlimited

  // Load previous attempt from API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/student/quiz?moduleId=${moduleId}&courseId=${courseId}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setState(data.result);
            setAttemptCount(data.result.attemptCount || 1);
          }
        }
      } catch (_) { /* ignore */ }
      setHistoryLoaded(true);
    }
    load();
  }, [moduleId, courseId]);

  function setAnswer(questionId: string, answer: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/student/quiz", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, courseId, weekId, dayId, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Server error ${res.status}`);
        console.error("Quiz submit error:", data);
      } else {
        setState(data.result);
        setAttemptCount(data.result.attemptCount || attemptCount + 1);
        if (data.result.passed && onPass) onPass();
      }
    } catch (e: any) {
      console.error("Quiz submit network error:", e);
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  function retry() {
    setState(null);
    setAnswers({});
  }

  // ── Loading state
  if (!historyLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted rounded-xl border border-dashed border-default">
        <HelpCircle className="size-10 mb-3 opacity-40" />
        <p className="font-semibold">No questions yet</p>
        <p className="text-xs mt-1">The instructor hasn't added questions to this quiz.</p>
      </div>
    );
  }

  // ── Results view
  if (state?.submitted) {
    const correctCount = state.results.filter(r => r.correct).length;
    const canRetry = !maxAttempts || attemptCount < maxAttempts;

    return (
      <div className="space-y-6 pb-10">
        {/* Score Card */}
        <div className={`rounded-2xl border-2 p-6 text-center shadow-sm ${
          state.passed ? "border-green-300 bg-green-50" : "border-red-200 bg-red-50"
        }`}>
          <div className={`inline-flex size-16 items-center justify-center rounded-full mb-3 ${
            state.passed ? "bg-green-100" : "bg-red-100"
          }`}>
            {state.passed
              ? <Trophy className="size-8 text-green-600" />
              : <XCircle className="size-8 text-red-500" />}
          </div>
          <h2 className={`text-2xl font-extrabold mb-1 ${state.passed ? "text-primary" : "text-red-700"}`}>
            {state.passed ? "Passed!" : "Not Quite"}
          </h2>
          <p className="text-sm font-semibold mb-2 text-foreground">
            {correctCount} / {questions.length} Correct
          </p>
          <p className="text-xs text-muted mt-2">
            You must get all questions correct to pass.
          </p>
          {attemptCount > 0 && (
            <p className="text-[10px] text-muted mt-1">
              Attempt #{attemptCount}{maxAttempts ? ` of ${maxAttempts}` : ""}
            </p>
          )}
        </div>

        {/* Retry Button */}
        {!state.passed && canRetry && (
          <button
            type="button"
            onClick={retry}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary bg-white py-3 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
          >
            <RotateCcw className="size-4" /> Retake Quiz
          </button>
        )}
        {!state.passed && !canRetry && (
          <p className="text-center text-sm text-muted">
            You've used all {maxAttempts} attempts. Contact your instructor for assistance.
          </p>
        )}

        {/* Per-question results */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted">Review Answers</h3>
          {questions.map((q, idx) => {
            const result = state.results.find((r) => r.questionId === q.id);
            const isCorrect = result?.correct ?? false;

            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 ${isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex size-6 shrink-0 items-center justify-center rounded-full mt-0.5 ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
                    {isCorrect
                      ? <CheckCircle2 className="size-3.5 text-green-600" />
                      : <XCircle className="size-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Q{idx + 1}. {q.question}</p>
                    {q.description && <p className="text-xs text-muted mt-0.5">{q.description}</p>}

                    {/* Show answer */}
                    <div className="mt-2 space-y-1">
                      {q.type === "mcq" && (
                        <>
                          <p className="text-xs">
                            <span className="font-bold text-muted">Your answer:</span>{" "}
                            <span className={isCorrect ? "text-primary" : "text-red-600"}>
                              {q.options?.[result?.selectedAnswer as number] ?? "—"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-xs">
                              <span className="font-bold text-muted">Correct:</span>{" "}
                              <span className="text-primary">{q.options?.[q.correctIndex ?? 0]}</span>
                            </p>
                          )}
                        </>
                      )}
                      {q.type === "text" && (
                        <>
                          <p className="text-xs">
                            <span className="font-bold text-muted">Your answer:</span>{" "}
                            <span className={isCorrect ? "text-primary" : "text-red-600"}>
                              {result?.selectedAnswer as string || "—"}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p className="text-xs">
                              <span className="font-bold text-muted">Correct:</span>{" "}
                              <span className="text-primary">{q.correctText}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                          💡 {q.explanation}
                        </p>
                      </div>
                    )}


                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quiz form view
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-xl border border-default bg-surface p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 text-purple-500" />
          <div>
            <p className="text-sm font-bold">Quiz</p>
            <p className="text-xs text-muted">{questions.length} questions · All correct to pass</p>
          </div>
        </div>
        <span className="text-xs text-muted font-semibold">{answeredCount}/{questions.length} answered</span>
      </div>

      {/* Questions */}
      {questions.map((q, idx) => (
        <QuestionBlock
          key={q.id}
          q={q}
          idx={idx}
          answer={answers[q.id]}
          onChange={(ans) => setAnswer(q.id, ans)}
        />
      ))}

      {/* Submit */}
      <button
        type="button"
        onClick={submit}
        disabled={!allAnswered || submitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {submitting ? (
          <><Loader2 className="size-4 animate-spin" /> Submitting...</>
        ) : (
          <><ChevronRight className="size-4" /> Submit Quiz</>
        )}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {!allAnswered && (
        <p className="text-center text-xs text-muted">Answer all {questions.length} questions to submit</p>
      )}
    </div>
  );
}

function QuestionBlock({
  q, idx, answer, onChange,
}: {
  q: QuizSubModuleQuestion;
  idx: number;
  answer: string | number | undefined;
  onChange: (ans: string | number) => void;
}) {
  return (
    <div className="rounded-xl border border-default bg-white shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="bg-surface px-4 py-3 border-b border-default">
        <div className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700 mt-0.5">
            {idx + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{q.question}</p>
            {q.description && <p className="text-xs text-muted mt-0.5">{q.description}</p>}
          </div>
        </div>
      </div>

      {/* Answer area */}
      <div className="p-4">
        {q.type === "mcq" ? (
          <div className="space-y-2">
            {(q.options || []).map((opt, oIdx) => (
              <label
                key={oIdx}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                  answer === oIdx
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-default bg-surface hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answer === oIdx}
                  onChange={() => onChange(oIdx)}
                  className="size-4 accent-primary shrink-0"
                />
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={(answer as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors"
          />
        )}
      </div>
    </div>
  );
}
