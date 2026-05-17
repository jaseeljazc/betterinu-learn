"use client";

import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function QuizBuilder({
  quizData,
  onChange,
}: {
  quizData: any;
  onChange: (newData: any) => void;
}) {
  const data = quizData || { questions: [] };
  const questions = data.questions || [];

  const updateQuestion = (index: number, updates: any) => {
    const nextQuestions = [...questions];
    nextQuestions[index] = { ...nextQuestions[index], ...updates };
    onChange({ ...data, questions: nextQuestions });
  };

  const removeQuestion = (index: number) => {
    const nextQuestions = [...questions];
    nextQuestions.splice(index, 1);
    onChange({ ...data, questions: nextQuestions });
  };

  const addQuestion = () => {
    onChange({
      ...data,
      questions: [
        ...questions,
        {
          id: Math.random().toString(36).substring(7),
          type: "multiple-choice",
          question: "",
          options: ["", "", "", ""],
          correctAnswer: "",
        },
      ],
    });
  };

  return (
    <div className="flex flex-col w-full gap-4 p-4 mt-2 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-wider text-[#374151]">
          Quiz Builder
        </span>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-[#d1d5db] rounded shadow-sm hover:bg-[#f3f4f6]"
        >
          <Plus className="size-3" /> Add Question
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q: any, qIdx: number) => (
          <div
            key={q.id}
            className="flex flex-col gap-3 p-4 bg-white border border-[#e5e7eb] rounded-lg relative shadow-sm"
          >
            <button
              type="button"
              onClick={() => removeQuestion(qIdx)}
              className="absolute top-3 right-3 text-[#9ca3af] hover:text-red-500 transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex gap-3">
              <Select
                value={q.type || "multiple-choice"}
                onValueChange={(v) => updateQuestion(qIdx, { type: v })}
              >
                <SelectTrigger className="h-8 w-44 rounded-md border border-[#d1d5db] bg-transparent text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="text">Text Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <textarea
              placeholder="Question text..."
              value={q.question || ""}
              onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
              className="w-full text-sm p-2 border border-[#d1d5db] rounded outline-none resize-y min-h-[60px]"
            />

            {q.type === "multiple-choice" && (
              <div className="flex flex-col gap-2 pl-3 border-l-2 border-[#e5e7eb] mt-2">
                <span className="text-xs font-semibold text-[#6b7280]">
                  Options (select the correct one):
                </span>
                {(q.options || ["", "", "", ""]).map((opt: string, oIdx: number) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctAnswer === opt && opt.trim() !== ""}
                      onChange={() => updateQuestion(qIdx, { correctAnswer: opt })}
                      className="size-3.5"
                    />
                    <input
                      placeholder={`Option ${oIdx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const nextOptions = [...q.options];
                        nextOptions[oIdx] = e.target.value;
                        // If this was the correct answer, update the correct answer too
                        const isCorrect = q.correctAnswer === opt && opt.trim() !== "";
                        updateQuestion(qIdx, {
                          options: nextOptions,
                          correctAnswer: isCorrect ? e.target.value : q.correctAnswer,
                        });
                      }}
                      className="flex-1 text-xs p-1.5 border border-[#d1d5db] rounded outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {q.type === "text" && (
              <div className="mt-2">
                <input
                  placeholder="Correct Answer (exact text)..."
                  value={q.correctAnswer || ""}
                  onChange={(e) => updateQuestion(qIdx, { correctAnswer: e.target.value })}
                  className="w-full text-sm p-2 border border-[#10b981] rounded outline-none"
                />
                <p className="text-[10px] text-[#6b7280] mt-1">
                  Students must type exactly this text to pass (case-insensitive).
                </p>
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center py-6 text-sm text-[#6b7280] border border-dashed border-[#d1d5db] rounded-lg">
            No questions added yet. Click "Add Question" to start building your quiz.
          </div>
        )}
      </div>
    </div>
  );
}
