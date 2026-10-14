"use client";

import clsx from "clsx";
import type { MyPollResponseDTO, PollQuestionDTO } from "@/types/realtime";

export function PollRound({
  questions,
  intro,
  myResponses,
  onVote,
  disabled,
}: {
  questions: PollQuestionDTO[];
  intro: string;
  myResponses: MyPollResponseDTO[];
  onVote: (questionId: string, choice: string) => void;
  disabled?: boolean;
}) {
  const choiceByQuestion = new Map(myResponses.map((r) => [r.questionId, r.choice]));
  const answered = questions.filter((q) => choiceByQuestion.has(q.id)).length;

  return (
    <div className="space-y-4">
      {intro && (
        <div className="cork-panel border-l-2 border-gold-500 p-3.5">
          <p className="label-eyebrow mb-1">Situação</p>
          <p className="text-sm font-semibold text-paper-50">{intro}</p>
        </div>
      )}

      <p className="text-xs text-paper-300/60">
        Responda rápido, sem pensar demais ({answered}/{questions.length} respondidas).
      </p>

      <div className="space-y-3">
        {questions.map((question) => {
          const myChoice = choiceByQuestion.get(question.id);
          return (
            <div key={question.id} className="cork-panel p-3.5">
              <p className="mb-2.5 text-sm font-semibold text-paper-50">{question.prompt}</p>
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const selected = myChoice === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      data-testid={`poll-option-${question.key}-${option}`}
                      disabled={disabled}
                      onClick={() => onVote(question.id, option)}
                      className={clsx(
                        "rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50",
                        selected
                          ? "border-gold-500 bg-gold-500/15 text-gold-500"
                          : "border-white/15 bg-white/5 text-paper-50 hover:bg-white/10",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
