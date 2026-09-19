"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RoomHeader } from "@/components/layout/RoomHeader";
import { Board } from "@/components/game/Board";
import { EvidenceBoard } from "@/components/game/EvidenceBoard";
import { ScenarioDossier } from "@/components/game/ScenarioDossier";
import { DistributionPanel } from "@/components/game/DistributionPanel";
import { IndividualReport } from "@/components/game/IndividualReport";
import { Timer } from "@/components/ui/Timer";
import { useParticipantSession } from "@/hooks/useParticipantSession";

export default function SalaPage() {
  const params = useParams<{ codigo: string }>();
  const searchParams = useSearchParams();
  const code = params.codigo.toUpperCase();
  const nameFromQuery = searchParams.get("name");

  const { joinStatus, joinError, room, me, actionError, join, placeCard, toggleEvidence, respondScenario } =
    useParticipantSession(code);

  const attemptedRef = useRef(false);
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    if (attemptedRef.current) return;
    if (joinStatus !== "idle") return;
    if (nameFromQuery) {
      attemptedRef.current = true;
      join(nameFromQuery);
    }
  }, [joinStatus, nameFromQuery, join]);

  if (!room && joinStatus !== "joined") {
    if (joinStatus === "error" && joinError) {
      return <ErrorScreen message={joinError} />;
    }
    if (!nameFromQuery && joinStatus === "idle") {
      return (
        <ManualJoinScreen
          code={code}
          name={manualName}
          setName={setManualName}
          onSubmit={() => manualName.trim() && join(manualName.trim())}
        />
      );
    }
    return <LoadingScreen text="Entrando na investigação…" />;
  }

  if (!room || !me) {
    return <LoadingScreen text="Sincronizando com a sala…" />;
  }

  const disabled = room.status !== "ROUND_OPEN";

  return (
    <main className="min-h-dvh pb-16">
      <RoomHeader
        gameName={room.game.name}
        code={room.code}
        status={room.status}
        round={room.currentRound}
        totalRounds={room.totalRounds}
        right={<Timer endsAt={room.roundTimerEndsAt} />}
      />

      {actionError && (
        <div className="mx-auto mt-3 max-w-4xl rounded-lg border border-alert-500/40 bg-alert-500/10 px-4 py-2 text-sm text-alert-400">
          {actionError}
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        {room.status === "LOBBY" && <LobbyScreen participantCount={room.participantCount} name={me.name} />}

        {room.status === "BRIEFING" && (
          <BriefingScreen gameName={room.game.name} description={room.game.description} />
        )}

        {room.status !== "LOBBY" && room.status !== "BRIEFING" && room.currentRound > 0 && (
          <>
            {(room.currentRound === 1 || room.currentRound === 2) && (
              <Board
                cards={room.game.cards}
                zones={room.game.zones}
                placements={me.placements}
                revealedZoneByCard={room.revealedZoneByCard}
                onPlace={placeCard}
                disabled={disabled}
              />
            )}

            {room.currentRound === 3 && (
              <EvidenceBoard
                cards={room.game.cards}
                evidences={room.game.evidences}
                associationsByCard={
                  new Map(me.evidenceAssociations.map((e) => [e.cardId, new Set(e.evidenceIds)]))
                }
                revealed={room.status === "REVEAL" || room.status === "FINAL"}
                onToggle={toggleEvidence}
                disabled={disabled}
              />
            )}

            {room.currentRound === 4 && (
              <ScenarioDossier
                scenario={room.game.scenario}
                evidences={room.game.evidences}
                responses={me.scenarioResponses}
                revealed={room.status === "REVEAL" || room.status === "FINAL"}
                revealedAnswers={room.revealedScenarioAnswers}
                onRespond={respondScenario}
                disabled={disabled}
              />
            )}

            {room.distribution && (
              <div className="cork-panel p-4">
                <p className="label-eyebrow mb-2.5">Como a turma está respondendo</p>
                <DistributionPanel distribution={room.distribution} cards={room.game.cards} zones={room.game.zones} />
              </div>
            )}
          </>
        )}

        {(room.status === "FINAL" || room.status === "CLOSED") && me.report && (
          <IndividualReport report={me.report} name={me.name} />
        )}
      </div>
    </main>
  );
}

function LobbyScreen({ participantCount, name }: { participantCount: number; name: string }) {
  return (
    <div className="dossier-card mx-auto max-w-md p-8 text-center">
      <p className="label-eyebrow">Bem-vindo(a), {name}</p>
      <h1 className="mt-1 font-display text-xl font-bold text-ink-900">
        Aguardando o início da investigação…
      </h1>
      <p className="mt-3 text-sm text-ink-700">
        {participantCount} investigador{participantCount === 1 ? "" : "es"} na sala.
      </p>
    </div>
  );
}

function BriefingScreen({ gameName, description }: { gameName: string; description: string }) {
  return (
    <div className="dossier-card mx-auto max-w-lg p-8 text-center">
      <p className="label-eyebrow">Briefing da missão</p>
      <h1 className="mt-1 font-display text-2xl font-black text-ink-900">{gameName}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-700">{description}</p>
      <p className="mt-4 text-xs font-semibold text-ink-700/60">
        Aguarde o professor abrir a Rodada 1.
      </p>
    </div>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <p className="font-mono text-sm text-paper-300/60">{text}</p>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="dossier-card max-w-sm p-6 text-center">
        <p className="font-display text-lg font-bold text-ink-900">Não foi possível entrar</p>
        <p className="mt-2 text-sm text-ink-700">{message}</p>
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
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="dossier-card w-full max-w-sm space-y-3 p-6"
      >
        <p className="label-eyebrow">Sala {code}</p>
        <h1 className="font-display text-lg font-bold text-ink-900">Informe seu nome para entrar</h1>
        <input
          className="input-field !bg-white !text-ink-900"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          maxLength={40}
          autoFocus
        />
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          Entrar na investigação
        </button>
      </form>
    </main>
  );
}
