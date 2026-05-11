import type { Quiz } from "@/types";
import { AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function QuizResult({
  quiz,
  selected,
  score,
  onRetry,
}: {
  quiz: Quiz;
  selected: Record<string, number>;
  score: number;
  onRetry: () => void;
}) {
  const passed = score >= quiz.passingScore;

  return (
    <div className="space-y-5 rounded-xl border border-default bg-surface p-6 text-center">
      <Badge variant={passed ? "success" : "danger"}>{passed ? "Passed" : "Needs retry"}</Badge>
      <p className="font-display text-6xl font-bold">{score} / {quiz.questions.length}</p>
      <p className="text-secondary">
        {passed ? "You passed. Week 2 is now unlocked." : `Try again. You need ${quiz.passingScore}/${quiz.questions.length} to pass.`}
      </p>
      <Badge variant="xp">+{passed ? 150 : 30} XP</Badge>
      <div className="rounded-xl border border-muted px-4 text-left">
        {quiz.questions.map((question, index) => {
          const correct = selected[question.id] === question.correctIndex;
          return (
            <AccordionItem
              key={question.id}
              title={
                <span className="flex items-center gap-3">
                  <Badge variant={correct ? "success" : "danger"}>{correct ? "Correct" : "Review"}</Badge>
                  Question {index + 1}
                </span>
              }
            >
              <p className="font-semibold">{question.question}</p>
              <p className="mt-2 text-sm text-secondary">{question.explanation}</p>
            </AccordionItem>
          );
        })}
      </div>
      {!passed ? (
        <Button onClick={onRetry} type="button" variant="secondary">
          Retry Quiz
        </Button>
      ) : null}
    </div>
  );
}
