import clsx from "clsx";
import type { RoundKey } from "@/types/realtime";
import { ROUND_LABELS } from "@/types/realtime";

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Preparando",
  LOBBY: "Aguardando início",
  BRIEFING: "Briefing da missão",
  ROUND_OPEN: "Investigação aberta",
  ROUND_FROZEN: "Respostas congeladas",
  REVEAL: "Revelação",
  NEXT_ROUND: "Avançando rodada",
  FINAL: "Caso encerrado",
  CLOSED: "Sala encerrada",
};

export function RoomHeader({
  gameName,
  code,
  status,
  round,
  totalRounds,
  participantCount,
  right,
}: {
  gameName: string;
  code: string;
  status: string;
  round: RoundKey | 0;
  totalRounds: number;
  participantCount?: number;
  right?: React.ReactNode;
}) {
  return (
    <header className="border-b border-white/10 bg-navy-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="label-eyebrow">catarse. · {gameName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-semibold text-paper-50">Sala {code}</span>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
                status === "REVEAL" || status === "FINAL"
                  ? "bg-confirm-500/15 text-confirm-400"
                  : status === "ROUND_FROZEN"
                    ? "bg-alert-500/15 text-alert-400"
                    : "bg-gold-500/15 text-gold-500",
              )}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
            {round > 0 && (
              <span className="text-xs font-medium text-paper-300/70">
                Rodada {round} de {totalRounds} · {ROUND_LABELS[round as RoundKey]}
              </span>
            )}
            {typeof participantCount === "number" && (
              <span className="text-xs font-medium text-paper-300/50">
                {participantCount} investigador{participantCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
        {right}
      </div>
    </header>
  );
}
