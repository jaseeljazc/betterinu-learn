import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function QuizResult({
  quiz,
  selected,
  score,
  onRetry,
  passingScore,
}: {
  quiz: any;
  selected: Record<string, string>;
  score: number;
  onRetry: () => void;
  passingScore: number;
}) {
  const passed = score >= passingScore;
  const questions = quiz.questions || [];

  return (
    <div className="space-y-5 rounded-xl border border-default bg-surface p-6 text-center">
      <Badge variant={passed ? "success" : "danger"}>{passed ? "Passed" : "Needs retry"}</Badge>
      <p className="font-display text-6xl font-bold">{score} / {questions.length}</p>
      <p className="text-secondary">
        {passed ? "You passed. Great job!" : `Try again. You need ${passingScore} correct to pass.`}
      </p>
      <Badge variant="xp">+{passed ? 150 : 30} XP</Badge>
      <Accordion type="multiple" className="rounded-xl border border-muted px-4 text-left w-full">
        {questions.map((question: any, index: number) => {
          const userAnswer = selected[question.id] || "";
          let correct = false;
          
          if (question.correctAnswer !== undefined) {
            if (question.type === "text" || typeof question.correctAnswer === "string") {
              correct = userAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
            } else {
              correct = userAnswer === question.correctAnswer;
            }
          } else if (question.correctIndex !== undefined && question.options) {
            correct = userAnswer === question.options[question.correctIndex];
          }

          return (
            <AccordionItem
              key={question.id}
              value={question.id}
              className="border-b-0 border-t border-muted first:border-t-0"
            >
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-3">
                  <Badge variant={correct ? "success" : "danger"}>{correct ? "Correct" : "Review"}</Badge>
                  Question {index + 1}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="font-semibold">{question.question}</p>
                {!correct && (
                  <div className="mt-3 p-3 bg-red-50 text-red-800 rounded text-sm border border-red-100">
                    <span className="font-bold">Your answer:</span> {userAnswer || <em className="text-red-400">No answer provided</em>}
                    <br />
                    <span className="font-bold">Correct answer:</span> {question.correctAnswer || question.options?.[question.correctIndex] || "N/A"}
                  </div>
                )}
                {question.explanation && (
                  <p className="mt-3 text-sm text-secondary border-t border-muted pt-3">{question.explanation}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      {!passed ? (
        <Button onClick={onRetry} type="button" variant="secondary">
          Retry Quiz
        </Button>
      ) : null}
    </div>
  );
}
