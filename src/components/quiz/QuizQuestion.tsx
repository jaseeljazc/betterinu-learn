"use client";

import type { QuizQuestion as QuizQuestionType } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizQuestion({
  question,
  index,
  total,
  selected,
  onSelect,
}: {
  question: QuizQuestionType;
  index: number;
  total: number;
  selected?: number;
  onSelect: (optionIndex: number) => void;
}) {
  return (
    <div className="rounded-xl border border-default bg-surface p-5">
      <p className="text-sm font-bold uppercase text-muted">Q {index + 1} of {total}</p>
      <h2 className="mt-3 font-display text-xl font-bold leading-8">{question.question}</h2>
      <div className="mt-6 grid gap-3">
        {question.options.map((option, optionIndex) => (
          <Button
            className={cn("h-auto justify-start py-4 text-left", selected === optionIndex && "border-focus bg-primary text-primary-foreground")}
            key={option}
            onClick={() => onSelect(optionIndex)}
            type="button"
            variant="secondary"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
