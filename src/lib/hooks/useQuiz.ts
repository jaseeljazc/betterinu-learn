"use client";

import { useMemo, useReducer } from "react";
import type { Quiz } from "@/types";

type State = {
  currentIndex: number;
  selected: Record<string, number>;
  isSubmitted: boolean;
};

type Action =
  | { type: "select"; questionId: string; optionIndex: number }
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
      return { ...state, selected: { ...state.selected, [action.questionId]: action.optionIndex } };
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

export function useQuiz(quiz: Quiz) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const score = useMemo(
    () =>
      quiz.questions.reduce((total, question) => {
        return total + (state.selected[question.id] === question.correctIndex ? 1 : 0);
      }, 0),
    [quiz.questions, state.selected],
  );

  return {
    state,
    score,
    currentQuestion: quiz.questions[state.currentIndex],
    selectOption: (questionId: string, optionIndex: number) => dispatch({ type: "select", questionId, optionIndex }),
    next: () => dispatch({ type: "next", total: quiz.questions.length }),
    submit: () => dispatch({ type: "submit" }),
    reset: () => dispatch({ type: "reset" }),
  };
}
