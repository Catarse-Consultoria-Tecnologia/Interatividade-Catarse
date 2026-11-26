import clsx from "clsx";
import type { GenesisProfessorStateDTO } from "@/lib/genesis/session-service";

export function ProfessorStudentsTable({ state }: { state: GenesisProfessorStateDTO }) {
  const stageTitles =
    state.participants[0]?.stages.map((s) => s.stageTitle.replace(/^Etapa\s+\d+\s*[—-]\s*/i, "")) ?? [];

  if (state.participants.length === 0) {
    return (
      <div className="rounded-card border border-borda bg-white p-6 text-center text-sm text-texto-secundario shadow-sm">
        Nenhum participante entrou na sala ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-borda bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs font-semibold uppercase tracking-wide text-texto-secundario">
            <th className="px-4 py-3">Aluno</th>
            {stageTitles.map((title, i) => (
              <th key={i} className="px-4 py-3">
                Etapa {i + 1}
                <span className="block font-normal normal-case text-texto-secundario/70">{title}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.participants.map((participant) => (
            <tr key={participant.id} className="border-b border-borda last:border-0">
              <td className="px-4 py-3 font-medium text-texto">
                {participant.name}
                {!participant.connected && (
                  <span className="ml-2 text-[11px] font-normal text-texto-secundario/60">(offline)</span>
                )}
              </td>
              {participant.stages.map((stage) => (
                <td key={stage.stageKey} className="px-4 py-3">
                  <StagePercentBadge percentCorrect={stage.percentCorrect} completed={stage.completed} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StagePercentBadge({ percentCorrect, completed }: { percentCorrect: number | null; completed: boolean }) {
  if (percentCorrect === null) {
    return <span className="text-texto-secundario/50">—</span>;
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        percentCorrect >= 80 && "bg-teal/10 text-teal",
        percentCorrect >= 50 && percentCorrect < 80 && "bg-ambar/10 text-ambar",
        percentCorrect < 50 && "bg-alert-500/10 text-alert-500",
      )}
    >
      {percentCorrect}%{completed ? "" : " (parcial)"}
    </span>
  );
}

export function OpenAnswersPanel({ state }: { state: GenesisProfessorStateDTO }) {
  if (state.openAnswersByStage.length === 0) {
    return (
      <div className="rounded-card border border-borda bg-white p-6 text-center text-sm text-texto-secundario shadow-sm">
        Nenhuma resposta de texto livre registrada ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {state.openAnswersByStage.map((group) => (
        <div key={group.stageKey}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-secundario">
            {group.stageTitle}
          </p>
          <div className="flex flex-col gap-3">
            {group.answers.map((answer, i) => (
              <div key={i} className="rounded-card border border-borda bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-texto">{answer.participantName}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">
                    Questão {answer.questionOrder}
                  </p>
                </div>
                <p className="mt-1 text-xs text-texto-secundario">{answer.prompt}</p>
                <p className="mt-2 whitespace-pre-line rounded-lg bg-cinza-calido px-3.5 py-2.5 text-sm text-texto">
                  {answer.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttentionPointsPanel({ state }: { state: GenesisProfessorStateDTO }) {
  if (state.attentionPoints.length === 0) {
    return (
      <div className="rounded-card border border-borda bg-white p-5 text-sm text-texto-secundario shadow-sm">
        Nenhum ponto de atenção identificado ainda — ou a amostra de respostas por questão ainda é pequena.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.attentionPoints.map((point, i) => (
        <div key={i} className="rounded-card border border-ambar/30 bg-ambar/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-texto-secundario">
            {point.stageTitle.replace(/^Etapa\s+\d+\s*[—-]\s*/i, "")} · Questão {point.questionOrder}
          </p>
          <p className="mt-1 text-sm font-medium text-texto">{point.prompt}</p>
          <p className="mt-1 text-xs text-texto-secundario">
            {Math.round(point.wrongRate * 100)}% de erro em {point.totalAnswered} respostas registradas
          </p>
        </div>
      ))}
    </div>
  );
}
