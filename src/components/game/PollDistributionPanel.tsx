"use client";

import type { PollDistributionDTO, PollQuestionDTO } from "@/types/realtime";

// Ciclo fixo de cores por posição da opção (não por valor) — como toda PollQuestion deste
// jogo usa a mesma ordem de opções (ex.: SIM, NÃO, DEPENDE), a cor de cada opção fica
// estável de pergunta pra pergunta.
const OPTION_COLORS = ["bg-gold-500", "bg-alert-500", "bg-confirm-500", "bg-info-500"];

export function PollDistributionPanel({
  distribution,
  questions,
}: {
  distribution: PollDistributionDTO[];
  questions: PollQuestionDTO[];
}) {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const rows = distribution.filter((d) => d.totalAnswers > 0);

  if (rows.length === 0) {
    return <p className="text-xs text-paper-300/50">Ainda não há respostas suficientes para exibir.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const question = questionById.get(row.questionId);
        if (!question) return null;
        return (
          <div key={row.questionId} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <p className="mb-1.5 text-sm font-semibold text-paper-50">{question.prompt}</p>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-navy-950">
              {question.options.map((option, i) => {
                const count = row.byChoice[option] ?? 0;
                const pct = row.totalAnswers === 0 ? 0 : (count / row.totalAnswers) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={option}
                    style={{ width: `${pct}%` }}
                    className={`${OPTION_COLORS[i % OPTION_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                    title={`${option}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {question.options.map((option, i) => {
                const count = row.byChoice[option] ?? 0;
                return (
                  <span key={option} className="flex items-center gap-1 text-[11px] text-paper-300/60">
                    <span className={`h-2 w-2 rounded-full ${OPTION_COLORS[i % OPTION_COLORS.length]}`} />
                    {option}: {count} ({row.totalAnswers === 0 ? 0 : Math.round((count / row.totalAnswers) * 100)}%)
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
