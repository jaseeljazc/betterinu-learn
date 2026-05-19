"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizQuestion({
  question,
  index,
  total,
  selected,
  onSelect,
}: {
  question: any;
  index: number;
  total: number;
  selected?: string;
  onSelect: (answer: string) => void;
}) {
  const isText = question.type === "text";
  const options = question.options || [];

  return (
    <div className="rounded-xl border border-default bg-surface p-5">
      <p className="text-sm font-bold uppercase text-muted">Q {index + 1} of {total}</p>
      <h2 className="mt-3 font-display text-xl font-bold leading-8">{question.question}</h2>
      
      <div className="mt-6 grid gap-3">
        {isText ? (
          <input
            type="text"
            className="w-full rounded-lg border border-default bg-subtle p-4 text-foreground outline-none focus:border-focus focus:ring-1 focus:ring-focus"
            placeholder="Type your answer here..."
            value={selected || ""}
            onChange={(e) => onSelect(e.target.value)}
          />
        ) : (
          options.map((option: string) => {
            const isSelected = selected === option;
            return (
              <Button
                className={cn(
                  "h-auto justify-start py-4 text-left",
                  isSelected && "border-focus bg-primary text-primary-foreground"
                )}
                key={option}
                onClick={() => onSelect(option)}
                type="button"
                variant="secondary"
              >
                {option}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
