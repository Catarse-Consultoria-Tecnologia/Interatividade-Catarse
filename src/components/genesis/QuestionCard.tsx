"use client";

import { useState } from "react";
import clsx from "clsx";
import type { GenesisQuestionDTO } from "@/lib/genesis/session-service";

export function QuestionCard({
  question,
  index,
  onAnswer,
}: {
  question: GenesisQuestionDTO;
  index: number;
  onAnswer: (optionId: string) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const answered = question.answer;

  async function handlePick(optionId: string) {
    if (answered || submitting) return;
    setSubmitting(optionId);
    try {
      await onAnswer(optionId);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-card border border-borda bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Questão {index}</p>
      <p className="mt-1 text-sm font-semibold text-texto">{question.prompt}</p>

      <div className="mt-4 flex flex-col gap-2">
        {question.options.map((option) => {
          const isChosen = answered?.optionId === option.id;
          const isCorrectOption = answered && answered.correctOptionId === option.id;
          const showAsWrong = answered && isChosen && !answered.isCorrect;

          return (
            <button
              key={option.id}
              type="button"
              disabled={Boolean(answered) || submitting !== null}
              onClick={() => handlePick(option.id)}
              className={clsx(
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm transition",
                !answered && "border-borda hover:border-azul-tecnico hover:bg-cinza-calido",
                answered && isCorrectOption && "border-teal bg-teal/10 text-texto",
                answered && showAsWrong && "border-ambar bg-ambar/10 text-texto",
                answered && !isChosen && !isCorrectOption && "border-borda text-texto-secundario",
                submitting === option.id && "opacity-60",
              )}
            >
              <span
                className={clsx(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                  answered && isCorrectOption && "border-teal bg-teal text-white",
                  answered && showAsWrong && "border-ambar bg-ambar text-white",
                  !(answered && (isCorrectOption || showAsWrong)) && "border-texto-secundario/40",
                )}
              >
                {answered && isCorrectOption ? "✓" : answered && showAsWrong ? "✕" : ""}
              </span>
              {option.text}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={clsx(
            "mt-3 rounded-lg px-3.5 py-3 text-sm",
            answered.isCorrect ? "bg-teal/10 text-texto" : "bg-ambar/10 text-texto",
          )}
        >
          <p className="font-semibold">{answered.isCorrect ? "Correto." : "Não foi essa."}</p>
          <p className="mt-1 text-texto-secundario">{answered.explanation}</p>
        </div>
      )}
    </div>
  );
}
