"use client";

import { useMemo, useReducer } from "react";

type State = {
  currentIndex: number;
  selected: Record<string, string>;
  isSubmitted: boolean;
};

type Action =
  | { type: "select"; questionId: string; answer: string }
  | { type: "next"; total: number }
  | { type: "submit" }
  | { type: "reset" };

const initialState: State = {
  currentIndex: 0,
  selected: {},
  isSubmitted: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return { ...state, selected: { ...state.selected, [action.questionId]: action.answer } };
    case "next":
      return { ...state, currentIndex: Math.min(action.total - 1, state.currentIndex + 1) };
    case "submit":
      return { ...state, isSubmitted: true };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

export function useQuiz(quizData: any) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const questions = quizData?.questions || [];

  const score = useMemo(() => {
    return questions.reduce((total: number, question: any) => {
      const userAnswer = state.selected[question.id] || "";
      let isCorrect = false;
      
      if (question.correctAnswer !== undefined) {
        if (question.type === "text" || typeof question.correctAnswer === "string") {
          isCorrect = userAnswer.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
        } else {
          isCorrect = userAnswer === question.correctAnswer;
        }
      } else if (question.correctIndex !== undefined && question.options) {
        isCorrect = userAnswer === question.options[question.correctIndex];
      }
      
      return total + (isCorrect ? 1 : 0);
    }, 0);
  }, [questions, state.selected]);

  return {
    state,
    score,
    currentQuestion: questions[state.currentIndex],
    totalQuestions: questions.length,
    selectOption: (questionId: string, answer: string) => dispatch({ type: "select", questionId, answer }),
    next: () => dispatch({ type: "next", total: questions.length }),
    submit: () => dispatch({ type: "submit" }),
    reset: () => dispatch({ type: "reset" }),
  };
}
