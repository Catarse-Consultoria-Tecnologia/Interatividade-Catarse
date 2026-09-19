import type { TimelineEventDTO } from "@/types/realtime";

const TYPE_LABEL: Record<string, string> = {
  SESSION_CREATED: "sala criada",
  PARTICIPANT_JOINED: "entrou na sala",
  PARTICIPANT_REMOVED: "foi removido(a)",
  PARTICIPANT_RENAMED: "foi renomeado(a)",
  HYPOTHESIS_REGISTERED: "registrou hipótese",
  HYPOTHESIS_REVISED: "revisou hipótese",
  CLUE_RELEASED: "pista liberada",
  EVIDENCE_ASSOCIATED: "associou evidência",
  SCENARIO_RESPONSE_SAVED: "respondeu ao dossiê",
  ROUND_FROZEN: "rodada congelada",
  ROUND_RESUMED: "rodada retomada",
  ROUND_REVEALED: "rodada revelada",
  ROUND_ADVANCED: "avançou de rodada",
  SESSION_FINISHED: "atividade finalizada",
  SESSION_CLOSED: "sala encerrada",
};

export function Timeline({ events }: { events: TimelineEventDTO[] }) {
  return (
    <div className="cork-panel p-4">
      <p className="label-eyebrow mb-2.5">Linha do tempo</p>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto font-mono text-xs">
        {events.map((e) => (
          <li key={e.id} className="flex gap-2 text-paper-300/70">
            <span className="shrink-0 text-paper-300/40">
              {new Date(e.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span>
              {e.participantName && <strong className="text-paper-50">{e.participantName} </strong>}
              {TYPE_LABEL[e.type] ?? e.type}
              {e.cardTitle && <span className="text-gold-500"> · {e.cardTitle}</span>}
            </span>
          </li>
        ))}
        {events.length === 0 && <p className="text-paper-300/50">Nenhum evento ainda.</p>}
      </ul>
    </div>
  );
}
