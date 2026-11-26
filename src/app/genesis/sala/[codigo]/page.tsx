"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useGenesisStudentSession } from "@/hooks/useGenesisStudentSession";
import { GenesisShell } from "@/components/genesis/Shell";
import { StageSidebarNav } from "@/components/genesis/StageSidebarNav";
import { StageView } from "@/components/genesis/StageView";

export default function GenesisSalaPage() {
  const params = useParams<{ codigo: string }>();
  const searchParams = useSearchParams();
  const code = params.codigo.toUpperCase();
  const nameFromQuery = searchParams.get("name");

  const { joinStatus, joinError, state, actionError, join, submitAnswer } = useGenesisStudentSession(code);
  const attemptedRef = useRef(false);
  const [manualName, setManualName] = useState("");
  const [activeStageKey, setActiveStageKey] = useState<string | null>(null);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (joinStatus !== "idle") return;
    if (nameFromQuery) {
      attemptedRef.current = true;
      join(nameFromQuery);
    }
  }, [joinStatus, nameFromQuery, join]);

  const defaultStageKey = useMemo(() => {
    if (!state) return null;
    const firstIncomplete = state.stages.find((s) => !s.completed && !s.locked);
    return (firstIncomplete ?? state.stages[state.stages.length - 1])?.key ?? null;
  }, [state]);

  useEffect(() => {
    if (!activeStageKey && defaultStageKey) setActiveStageKey(defaultStageKey);
  }, [activeStageKey, defaultStageKey]);

  if (joinStatus === "error" && joinError) {
    return <MessageScreen title="Não foi possível entrar" body={joinError} />;
  }

  if (joinStatus === "idle" && !nameFromQuery) {
    return (
      <ManualJoinScreen
        code={code}
        name={manualName}
        setName={setManualName}
        onSubmit={() => manualName.trim() && join(manualName.trim())}
      />
    );
  }

  if (!state) {
    return <LoadingScreen text="Entrando na sala…" />;
  }

  if (state.sessionStatus === "LOBBY") {
    return (
      <MessageScreen
        title={`Bem-vindo(a), ${state.participantName}`}
        body="Aguardando o professor iniciar a Operação Gênesis. Esta página atualiza automaticamente."
      />
    );
  }

  if (state.sessionStatus === "CLOSED") {
    return <MessageScreen title="Sala encerrada" body="O professor encerrou esta sala." />;
  }

  const activeStage = state.stages.find((s) => s.key === activeStageKey) ?? state.stages.at(0);

  if (!activeStage) {
    return <MessageScreen title="Sem etapas cadastradas" body="Este jogo ainda não tem etapas configuradas." />;
  }

  return (
    <GenesisShell
      title={activeStage.title}
      sidebar={
        <>
          <div className="px-3 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{state.gameName}</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{state.participantName}</p>
          </div>
          <StageSidebarNav
            stages={state.stages.map((s) => ({
              key: s.key,
              order: s.order,
              title: s.title,
              locked: s.locked,
              completed: s.completed,
            }))}
            activeKey={activeStage.key}
            onSelect={setActiveStageKey}
          />
        </>
      }
    >
      {actionError && (
        <div className="mb-4 rounded-lg border border-ambar/40 bg-ambar/10 px-4 py-2 text-sm text-texto">
          {actionError}
        </div>
      )}
      <StageView stage={activeStage} onAnswer={(questionId, optionId) => submitAnswer(questionId, optionId).then(() => undefined)} />
    </GenesisShell>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-off-white font-jakarta p-6">
      <p className="text-sm text-texto-secundario">{text}</p>
    </main>
  );
}

function MessageScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-off-white p-6 font-jakarta">
      <div className="max-w-sm rounded-card border border-borda bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-texto">{title}</p>
        <p className="mt-2 text-sm text-texto-secundario">{body}</p>
      </div>
    </main>
  );
}

function ManualJoinScreen({
  code,
  name,
  setName,
  onSubmit,
}: {
  code: string;
  name: string;
  setName: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-off-white p-6 font-jakarta">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-sm space-y-3 rounded-card border border-borda bg-white p-6 shadow-sm"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Sala {code}</p>
        <h1 className="text-lg font-bold text-texto">Informe seu nome para entrar</h1>
        <input
          className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-sm text-texto outline-none focus:border-azul-tecnico"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          maxLength={40}
          autoFocus
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-azul-tecnico px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!name.trim()}
        >
          Entrar na sala
        </button>
      </form>
    </main>
  );
}
