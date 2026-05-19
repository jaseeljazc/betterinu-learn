"use client";

import { useState } from "react";
import { Plus, Trash2, HelpCircle, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import type { QuizSubModuleQuestion, QuizSubModuleData } from "@/types";

function uid() {
  return `q_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultQuestion(): QuizSubModuleQuestion {
  return {
    id: uid(),
    type: "mcq",
    question: "",
    description: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    marks: 1,
    explanation: "",
  };
}

function calcTotal(questions: QuizSubModuleQuestion[]) {
  return 0; // removed marks system
}

interface QuestionCardProps {
  q: QuizSubModuleQuestion;
  idx: number;
  onChange: (updated: QuizSubModuleQuestion) => void;
  onRemove: () => void;
}

function QuestionCard({ q, idx, onChange, onRemove }: QuestionCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  function patch(fields: Partial<QuizSubModuleQuestion>) {
    onChange({ ...q, ...fields });
  }

  const inputCls = "w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted mb-1";

  return (
    <div className="rounded-xl border border-default bg-white shadow-sm">
      {/* Card Header */}
      <div className="flex items-center gap-2 bg-surface px-3 py-2 border-b border-default">
        <button type="button" className="cursor-grab text-muted p-1">
          <GripVertical className="size-4" />
        </button>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          q.type === "mcq" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
        }`}>
          <HelpCircle className="size-3" />
          {q.type === "mcq" ? "Multiple Choice" : "Text Answer"}
        </span>
        <span className="flex-1 text-[10px] text-muted ml-1">Q{idx + 1}</span>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-muted hover:text-primary transition-colors"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-muted hover:text-red-600 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Type Toggle */}
          <div>
            <label className={labelCls}>Question Type</label>
            <div className="flex bg-surface rounded-lg p-1 border border-default">
              <button
                type="button"
                onClick={() => patch({ type: "mcq", options: q.options?.length ? q.options : ["", "", "", ""], correctIndex: 0 })}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${q.type === "mcq" ? "bg-primary shadow-sm border border-default text-white" : "text-muted hover:text-foreground"}`}
              >
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => patch({ type: "text", correctText: q.correctText || "" })}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${q.type === "text" ? "bg-primary shadow-sm border border-default text-white" : "text-muted hover:text-foreground"}`}
              >
                Text Answer
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className={labelCls}>Question</label>
            <textarea
              className={`${inputCls} resize-y min-h-[60px]`}
              value={q.question}
              onChange={(e) => patch({ question: e.target.value })}
              placeholder="Enter your question..."
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className={labelCls}>Description / Sub-text (optional)</label>
            <input
              className={inputCls}
              value={q.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Additional context or instructions..."
            />
          </div>

          {/* MCQ Options */}
          {q.type === "mcq" && (
            <div>
              <label className={labelCls}>Options — select the correct answer</label>
              <div className="space-y-2">
                {(q.options || ["", "", "", ""]).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === oIdx}
                      onChange={() => patch({ correctIndex: oIdx })}
                      className="size-3.5 accent-primary shrink-0"
                    />
                    <input
                      className={inputCls}
                      placeholder={`Option ${oIdx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...(q.options || [])];
                        next[oIdx] = e.target.value;
                        patch({ options: next });
                      }}
                    />
                    {(q.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = (q.options || []).filter((_, i) => i !== oIdx);
                          const newCorrect = q.correctIndex !== undefined && q.correctIndex >= next.length
                            ? next.length - 1
                            : q.correctIndex;
                          patch({ options: next, correctIndex: newCorrect });
                        }}
                        className="shrink-0 text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {(q.options || []).length < 6 && (
                  <button
                    type="button"
                    onClick={() => patch({ options: [...(q.options || []), ""] })}
                    className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <Plus className="size-3" /> Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text Answer */}
          {q.type === "text" && (
            <div>
              <label className={labelCls}>Correct Answer (case-insensitive match)</label>
              <input
                className={`${inputCls} border-green-400 focus:border-green-500`}
                value={q.correctText || ""}
                onChange={(e) => patch({ correctText: e.target.value })}
                placeholder="Expected answer..."
              />
              <p className="text-[10px] text-muted mt-1">
                Student's input will be compared case-insensitively to this.
              </p>
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className={labelCls}>Explanation (shown after answering)</label>
            <input
              className={inputCls}
              value={q.explanation || ""}
              onChange={(e) => patch({ explanation: e.target.value })}
              placeholder="Why is this the correct answer?"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface QuizModuleEditorProps {
  quizData: QuizSubModuleData;
  onChange: (data: QuizSubModuleData) => void;
}

export function QuizModuleEditor({ quizData, onChange }: QuizModuleEditorProps) {
  const questions = quizData.questions || [];

  function patch(fields: Partial<QuizSubModuleData>) {
    onChange({ ...quizData, ...fields });
  }

  function addQuestion() {
    patch({ questions: [...questions, defaultQuestion()] });
  }

  function updateQuestion(idx: number, updated: QuizSubModuleQuestion) {
    const next = [...questions];
    next[idx] = updated;
    patch({ questions: next });
  }

  function removeQuestion(idx: number) {
    patch({ questions: questions.filter((_, i) => i !== idx) });
  }

  const inputCls = "w-full rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-muted mb-1";

  return (
    <div className="space-y-4">
      {/* Quiz Settings */}
      <div className="rounded-xl border border-default bg-surface p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted border-b border-default pb-2">
          Quiz Settings
        </h4>
        <div>
          <label className={labelCls}>Max Attempts (blank = unlimited)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={quizData.maxAttempts ?? ""}
            onChange={(e) => patch({ maxAttempts: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Unlimited"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="font-bold text-primary text-sm">{questions.length}</span> questions
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            q={q}
            idx={idx}
            onChange={(updated) => updateQuestion(idx, updated)}
            onRemove={() => removeQuestion(idx)}
          />
        ))}

        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-default py-10 text-center text-muted">
            <HelpCircle className="size-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No questions yet</p>
            <p className="text-xs mt-1">Add your first question below</p>
          </div>
        )}
      </div>

      {/* Add Question Button */}
      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 hover:border-primary transition-colors"
      >
        <Plus className="size-4" />
        Add Question
      </button>
    </div>
  );
}
