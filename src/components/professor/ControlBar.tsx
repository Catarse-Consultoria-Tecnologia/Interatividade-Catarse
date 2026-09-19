"use client";

import { useState } from "react";
import type { ProfessorActionType, ProfessorStateDTO } from "@/types/realtime";

const TIMER_PRESETS = [
  { label: "3 min", seconds: 180 },
  { label: "4 min", seconds: 240 },
  { label: "5 min", seconds: 300 },
];

export function ControlBar({
  state,
  runAction,
}: {
  state: ProfessorStateDTO;
  runAction: (action: ProfessorActionType, payload?: Record<string, unknown>) => void;
}) {
  const [releasing, setReleasing] = useState(false);
  const status = state.status;

  function releaseNextClue() {
    setReleasing(true);
    runAction("RELEASE_CLUE");
    setTimeout(() => setReleasing(false), 500);
  }

  const totalClues = state.game.cards.reduce((sum, c) => sum + c.totalClues, 0);
  const releasedClues = Object.values(state.releasedClueIdsByCard).reduce((s, l) => s + l.length, 0);

  return (
    <div className="cork-panel space-y-3 p-4">
      <p className="label-eyebrow">Ações do professor</p>

      <div className="flex flex-wrap gap-2">
        {status === "LOBBY" && (
          <button className="btn-primary" onClick={() => runAction("START")}>
            Iniciar briefing
          </button>
        )}

        {status === "BRIEFING" && (
          <button className="btn-primary" onClick={() => runAction("NEXT_ROUND")}>
            Iniciar Rodada 1
          </button>
        )}

        {status === "ROUND_OPEN" && (
          <>
            <button className="btn-secondary" onClick={() => runAction("FREEZE")}>
              Congelar respostas
            </button>
            {state.currentRound === 2 && (
              <button
                className="btn-secondary"
                disabled={releasing || releasedClues >= totalClues}
                onClick={releaseNextClue}
              >
                Liberar próxima pista ({releasedClues}/{totalClues})
              </button>
            )}
          </>
        )}

        {status === "ROUND_FROZEN" && (
          <>
            <button className="btn-secondary" onClick={() => runAction("RESUME")}>
              Continuar
            </button>
            <button className="btn-primary" onClick={() => runAction("REVEAL")}>
              Revelar solução
            </button>
          </>
        )}

        {(status === "ROUND_OPEN" || status === "ROUND_FROZEN" || status === "REVEAL") && (
          <button className="btn-secondary" onClick={() => runAction("SHOW_DISTRIBUTION")}>
            {state.distributionVisible ? "Ocultar distribuição" : "Mostrar distribuição"}
          </button>
        )}

        {status === "REVEAL" && (
          <button className="btn-primary" onClick={() => runAction("NEXT_ROUND")}>
            {state.currentRound >= state.totalRounds ? "Finalizar atividade" : "Avançar rodada"}
          </button>
        )}

        {status === "FINAL" && (
          <button className="btn-secondary" onClick={() => runAction("CLOSE")}>
            Encerrar sala
          </button>
        )}

        {status !== "FINAL" && status !== "CLOSED" && (
          <button className="btn-danger ml-auto" onClick={() => runAction("FINISH")}>
            Finalizar atividade agora
          </button>
        )}
      </div>

      {(status === "ROUND_OPEN" || status === "ROUND_FROZEN") && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <span className="text-xs text-paper-300/60">Cronômetro:</span>
          {TIMER_PRESETS.map((preset) => (
            <button
              key={preset.seconds}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-paper-50 hover:bg-white/10"
              onClick={() => runAction("SET_TIMER", { seconds: preset.seconds })}
            >
              {preset.label}
            </button>
          ))}
          <button
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-paper-300/60 hover:bg-white/10"
            onClick={() => runAction("CLEAR_TIMER")}
          >
            Limpar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <button
          className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-paper-50 hover:bg-white/10"
          onClick={() => runAction(state.lobbyLocked ? "UNLOCK_LOBBY" : "LOCK_LOBBY")}
        >
          {state.lobbyLocked ? "🔓 Liberar entrada" : "🔒 Bloquear entrada"}
        </button>
        <button
          className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-paper-50 hover:bg-white/10"
          onClick={() => runAction("TOGGLE_SOUND")}
        >
          {state.soundEnabled ? "🔊 Som ligado" : "🔈 Som desligado"}
        </button>
      </div>
    </div>
  );
}
