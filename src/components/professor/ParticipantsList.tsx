"use client";

import { useState } from "react";
import clsx from "clsx";
import type { ProfessorActionType, ProfessorParticipantRowDTO } from "@/types/realtime";

export function ParticipantsList({
  participants,
  runAction,
}: {
  participants: ProfessorParticipantRowDTO[];
  runAction: (action: ProfessorActionType, payload?: Record<string, unknown>) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <div className="cork-panel p-4">
      <p className="label-eyebrow mb-2.5">
        {participants.length} investigador{participants.length === 1 ? "" : "es"} conectado
        {participants.length === 1 ? "" : "s"}
      </p>
      <ul className="max-h-72 space-y-1.5 overflow-y-auto">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={clsx(
                  "h-2 w-2 shrink-0 rounded-full",
                  p.connected ? "bg-confirm-500" : "bg-white/20",
                )}
              />
              {renamingId === p.id ? (
                <input
                  autoFocus
                  className="min-w-0 rounded bg-navy-950 px-1.5 py-0.5 text-xs text-paper-50 outline-none"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    if (renameValue.trim()) {
                      runAction("RENAME_PARTICIPANT", { participantId: p.id, name: renameValue.trim() });
                    }
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              ) : (
                <button
                  className="truncate text-sm text-paper-50 hover:underline"
                  onClick={() => {
                    setRenamingId(p.id);
                    setRenameValue(p.name);
                  }}
                  title="Renomear"
                >
                  {p.name}
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-xs text-gold-500">{p.totalScore} pts</span>
              <span className="text-[11px] text-paper-300/50">{p.answeredCurrentRound} resp.</span>
              <button
                className="text-xs text-alert-400 hover:underline"
                onClick={() => runAction("REMOVE_PARTICIPANT", { participantId: p.id })}
              >
                remover
              </button>
            </div>
          </li>
        ))}
        {participants.length === 0 && (
          <p className="text-xs text-paper-300/50">Ninguém entrou na sala ainda.</p>
        )}
      </ul>
    </div>
  );
}
