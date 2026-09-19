"use client";

import { useParams } from "next/navigation";
import { Timer } from "@/components/ui/Timer";
import { RoomQRCode } from "@/components/ui/RoomQRCode";
import { DistributionPanel } from "@/components/game/DistributionPanel";
import { useViewerSession } from "@/hooks/useViewerSession";
import { ROUND_LABELS, type RoundKey } from "@/types/realtime";

export default function TelaoPage() {
  const params = useParams<{ codigo: string }>();
  const code = params.codigo.toUpperCase();
  const { room, error } = useViewerSession(code);

  if (error) {
    return (
      <Screen>
        <p className="font-display text-2xl text-alert-400">{error}</p>
      </Screen>
    );
  }
  if (!room) {
    return (
      <Screen>
        <p className="font-mono text-paper-300/60">Conectando à sala {code}…</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex w-full max-w-6xl flex-1 flex-col gap-6 px-8 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="label-eyebrow text-base">catarse. · {room.game.name}</p>
            <p className="font-mono text-2xl font-bold text-paper-50">Sala {room.code}</p>
          </div>
          <div className="flex items-center gap-4">
            {room.currentRound > 0 && (
              <p className="text-lg font-semibold text-paper-300/80">
                Rodada {room.currentRound} de {room.totalRounds} ·{" "}
                {ROUND_LABELS[room.currentRound as RoundKey]}
              </p>
            )}
            <Timer endsAt={room.roundTimerEndsAt} className="!text-base" />
          </div>
        </header>

        {room.status === "LOBBY" && <LobbyView code={room.code} count={room.participantCount} />}

        {room.status === "BRIEFING" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="label-eyebrow text-base">Briefing da missão</p>
            <h1 className="mt-2 font-display text-4xl font-black text-paper-50">{room.game.name}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-paper-300/80">{room.game.description}</p>
          </div>
        )}

        {room.status !== "LOBBY" && room.status !== "BRIEFING" && room.status !== "FINAL" && room.status !== "CLOSED" && (
          <div className="flex-1 space-y-5">
            {room.currentRound <= 2 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {room.game.zones.map((zone) => (
                  <div key={zone.id} className="cork-panel p-4">
                    <h2 className="font-display text-lg font-bold text-paper-50">{zone.name}</h2>
                    <p className="text-xs text-paper-300/60">{zone.subtitle}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="font-display text-2xl text-paper-300/70">
                  {room.participantCount} investigadores trabalhando em{" "}
                  {room.currentRound === 3 ? "Mesa de Evidências" : "Dossiê #002 — Aurora"}…
                </p>
              </div>
            )}

            {room.distribution && (
              <div className="cork-panel p-4">
                <p className="label-eyebrow mb-2.5 text-base">Progresso coletivo</p>
                <DistributionPanel distribution={room.distribution} cards={room.game.cards} zones={room.game.zones} />
              </div>
            )}
          </div>
        )}

        {(room.status === "FINAL" || room.status === "CLOSED") && <FinalView />}
      </div>
    </Screen>
  );
}

function LobbyView({ code, count }: { code: string; count: number }) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="label-eyebrow text-base">O sistema foi embaralhado</p>
      <h1 className="font-display text-5xl font-black text-paper-50">OPERAÇÃO SFN</h1>
      <p className="text-lg text-paper-300/80">Sua missão é reconstruir o mapa.</p>
      <RoomQRCode url={`${appUrl}/sala/${code}`} />
      <p className="font-mono text-3xl font-bold tracking-[0.3em] text-gold-500">{code}</p>
      <p className="text-paper-300/60">{count} investigador{count === 1 ? "" : "es"} conectado{count === 1 ? "" : "s"}</p>
    </div>
  );
}

function FinalView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div>
        <p className="label-eyebrow text-base">Caso encerrado</p>
        <h1 className="font-display text-4xl font-black text-paper-50">O mapa do SFN foi reconstruído.</h1>
      </div>

      <div className="flex items-center gap-3 font-display text-xl font-bold text-gold-500">
        <span>Normatiza</span>
        <span className="text-paper-300/40">→</span>
        <span>Supervisiona</span>
        <span className="text-paper-300/40">→</span>
        <span>Opera</span>
        <span className="text-paper-300/40">→</span>
        <span>Cliente</span>
      </div>

      <div>
        <p className="font-display text-2xl font-black text-paper-50">
          As quatro perguntas do investigador
        </p>
        <div className="mx-auto mt-4 max-w-md space-y-2 text-lg text-paper-300/85">
          <p>Quem faz?</p>
          <p>Quem autoriza ou regula?</p>
          <p>Quem supervisiona?</p>
          <p>Qual evidência comprova?</p>
        </div>
      </div>

      <p className="max-w-lg text-paper-300/70">
        Você não precisa decorar todas as siglas. Precisa aprender a fazer as perguntas corretas.
      </p>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-noir-fade bg-cork">{children}</main>
  );
}
