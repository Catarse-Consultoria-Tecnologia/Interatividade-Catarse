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
  onAnswer: (input: { optionId?: string; answerText?: string }) => Promise<void>;
}) {
  if (question.type === "OPEN_TEXT") {
    return <OpenTextQuestionCard question={question} index={index} onAnswer={onAnswer} />;
  }
  return <MultipleChoiceQuestionCard question={question} index={index} onAnswer={onAnswer} />;
}

function MultipleChoiceQuestionCard({
  question,
  index,
  onAnswer,
}: {
  question: GenesisQuestionDTO;
  index: number;
  onAnswer: (input: { optionId?: string; answerText?: string }) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const answered = question.answer?.type === "MULTIPLE_CHOICE" ? question.answer : null;

  async function handlePick(optionId: string) {
    if (answered || submitting) return;
    setSubmitting(optionId);
    try {
      await onAnswer({ optionId });
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

function OpenTextQuestionCard({
  question,
  index,
  onAnswer,
}: {
  question: GenesisQuestionDTO;
  index: number;
  onAnswer: (input: { optionId?: string; answerText?: string }) => Promise<void>;
}) {
  const answered = question.answer?.type === "OPEN_TEXT" ? question.answer : null;
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await onAnswer({ answerText: text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-card border border-borda bg-white p-5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Questão {index}</p>
        <span className="rounded-full bg-azul-tecnico/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azul-tecnico">
          Resposta livre
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold text-texto">{question.prompt}</p>

      {answered ? (
        <div className="mt-4 rounded-lg border border-borda bg-cinza-calido px-3.5 py-3 text-sm text-texto">
          <p className="whitespace-pre-line">{answered.text}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={submitting}
            rows={5}
            maxLength={4000}
            placeholder="Escreva sua resposta aqui…"
            className="w-full rounded-lg border border-borda bg-white px-3.5 py-2.5 text-sm text-texto outline-none focus:border-azul-tecnico disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!draft.trim() || submitting}
            className="self-end rounded-lg bg-azul-tecnico px-4 py-2 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Enviando…" : "Enviar resposta"}
          </button>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-cinza-calido/60 px-3.5 py-2.5 text-xs text-texto-secundario">
        {answered
          ? "Resposta registrada — o professor vai avaliar manualmente."
          : "Esta questão não tem gabarito automático: o professor lê sua resposta depois."}
      </div>
    </div>
  );
}
