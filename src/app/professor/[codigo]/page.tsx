"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RoomHeader } from "@/components/layout/RoomHeader";
import { Timer } from "@/components/ui/Timer";
import { RoomQRCode } from "@/components/ui/RoomQRCode";
import { ControlBar } from "@/components/professor/ControlBar";
import { ParticipantsList } from "@/components/professor/ParticipantsList";
import { Timeline } from "@/components/professor/Timeline";
import { DistributionPanel } from "@/components/game/DistributionPanel";
import { ClassReport } from "@/components/game/ClassReport";
import { useProfessorSession, getStoredHostToken } from "@/hooks/useProfessorSession";

export default function ProfessorRoomPage() {
  const params = useParams<{ codigo: string }>();
  const code = params.codigo.toUpperCase();
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setHostToken(getStoredHostToken(code));
  }, [code]);

  const { status, error, state, runAction } = useProfessorSession(code, hostToken ?? null);

  if (hostToken === undefined) return <Loading text="Carregando…" />;

  if (hostToken === null) {
    return (
      <Message
        title="Chave de professor não encontrada"
        body="Abra o link de controle desta sala no mesmo navegador em que ela foi criada, em /professor/novo."
      />
    );
  }

  if (status === "error") {
    return <Message title="Não foi possível abrir o painel" body={error ?? "Erro desconhecido."} />;
  }

  if (!state) return <Loading text="Conectando ao painel do professor…" />;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${appUrl}/sala/${state.code}`;
  const telaoUrl = `${appUrl}/sala/${state.code}/telao`;

  return (
    <main className="min-h-dvh pb-16">
      <RoomHeader
        gameName={state.game.name}
        code={state.code}
        status={state.status}
        round={state.currentRound}
        totalRounds={state.totalRounds}
        participantCount={state.participantCount}
        right={<Timer endsAt={state.roundTimerEndsAt} />}
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        {state.status === "LOBBY" && (
          <div className="dossier-card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <RoomQRCode url={joinUrl} />
            <div>
              <p className="label-eyebrow">Convide a turma</p>
              <p className="font-display text-2xl font-black text-ink-900">Código {state.code}</p>
              <p className="mt-1 text-sm text-ink-700">{joinUrl}</p>
              <a
                href={telaoUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary mt-3 inline-flex !bg-navy-900 !text-paper-50"
              >
                Abrir tela coletiva (telão) ↗
              </a>
            </div>
          </div>
        )}

        <ControlBar state={state} runAction={runAction} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ParticipantsList participants={state.participantsDetailed} runAction={runAction} />
          <Timeline events={state.timeline} />
        </div>

        {state.status !== "LOBBY" && state.status !== "BRIEFING" && (
          <div className="cork-panel p-4">
            <p className="label-eyebrow mb-2.5">Distribuição de respostas (visível só para você, exceto quando publicada)</p>
            <DistributionPanel
              distribution={state.distributionAlways}
              cards={state.game.cards}
              zones={state.game.zones}
            />
          </div>
        )}

        {(state.status === "FINAL" || state.status === "CLOSED") && state.classReport && (
          <div>
            <p className="label-eyebrow mb-2.5">Relatório da turma</p>
            <ClassReport report={state.classReport} />
          </div>
        )}
      </div>
    </main>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <p className="font-mono text-sm text-paper-300/60">{text}</p>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="dossier-card max-w-sm p-6 text-center">
        <p className="font-display text-lg font-bold text-ink-900">{title}</p>
        <p className="mt-2 text-sm text-ink-700">{body}</p>
      </div>
    </main>
  );
}
