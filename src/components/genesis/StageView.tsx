import { CopyButton } from "./CopyButton";
import { QuestionCard } from "./QuestionCard";
import type { GenesisStageDTO } from "@/lib/genesis/session-service";

export function StageView({
  stage,
  onAnswer,
}: {
  stage: GenesisStageDTO;
  onAnswer: (questionId: string, optionId: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-borda bg-white p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-azul-tecnico">Etapa {stage.order} de 4</p>
        <h2 className="mt-1 text-xl font-bold text-texto">{stage.title}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-texto-secundario">{stage.narrative}</p>
      </div>

      {stage.script && (
        <div className="overflow-hidden rounded-card border border-azul-institucional/20 bg-azul-institucional">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="text-xs font-semibold text-white/80">{stage.scriptLabel ?? "Script"}</p>
            <CopyButton text={stage.script} />
          </div>
          <pre className="max-h-[420px] overflow-auto px-4 py-4 text-xs leading-relaxed text-white/90">
            <code>{stage.script}</code>
          </pre>
        </div>
      )}

      <div className="rounded-card border border-borda bg-cinza-calido px-4 py-3 text-sm text-texto-secundario">
        Rode o script no seu schema, no Azure SQL Database, usando o VS Code com a extensão{" "}
        <strong className="text-texto">SQL Server (mssql)</strong>. Depois, responda as questões abaixo com base no
        que você observou.
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-texto">Rodada de questões</p>
        <p className="text-xs font-semibold text-texto-secundario">
          {stage.answeredCount} / {stage.totalQuestions} respondidas
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {stage.questions.map((question, idx) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={idx + 1}
            onAnswer={(optionId) => onAnswer(question.id, optionId)}
          />
        ))}
      </div>

      {stage.completed && (
        <div className="rounded-card border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-texto">
          Etapa concluída. {stage.order < 4 ? "A próxima etapa já está liberada no menu à esquerda." : "Você concluiu a Operação Gênesis."}
        </div>
      )}
    </div>
  );
}
