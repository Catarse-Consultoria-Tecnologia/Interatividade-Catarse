"use client";

import { useState } from "react";
import clsx from "clsx";
import type { CardDTO, EvidenceDTO } from "@/types/realtime";

const STRENGTH_LABEL: Record<EvidenceDTO["strength"], string> = {
  STRONG: "Evidência forte",
  COMPLEMENTARY: "Evidência complementar",
  WEAK: "Evidência fraca",
  DECOY: "Evidência enganosa",
};

const STRENGTH_CLASS: Record<EvidenceDTO["strength"], string> = {
  STRONG: "border-confirm-500/60 bg-confirm-500/10 text-confirm-400",
  COMPLEMENTARY: "border-info-500/60 bg-info-500/10 text-info-400",
  WEAK: "border-white/20 bg-white/5 text-paper-300/70",
  DECOY: "border-alert-500/60 bg-alert-500/10 text-alert-400",
};

export function EvidenceBoard({
  cards,
  evidences,
  associationsByCard,
  revealed,
  onToggle,
  disabled,
}: {
  cards: CardDTO[];
  evidences: EvidenceDTO[];
  associationsByCard: Map<string, Set<string>>;
  revealed: boolean;
  onToggle: (cardId: string, evidenceId: string) => void;
  disabled?: boolean;
}) {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? "");
  const selectedAssociations = associationsByCard.get(selectedCardId) ?? new Set<string>();

  return (
    <div className="space-y-4">
      <div className="cork-panel p-3.5">
        <p className="label-eyebrow mb-2.5">Qual carta você está investigando?</p>
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => {
            const count = associationsByCard.get(card.id)?.size ?? 0;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  card.id === selectedCardId
                    ? "border-gold-500 bg-gold-500 text-ink-900"
                    : "border-white/15 bg-white/5 text-paper-50 hover:bg-white/10",
                )}
              >
                {card.title}
                {count > 0 && <span className="ml-1.5 opacity-70">· {count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="dossier-card p-4">
        <p className="label-eyebrow mb-1">Mesa de evidências</p>
        <p className="mb-3 text-sm text-ink-700">
          Selecione as evidências que sustentam a conclusão sobre{" "}
          <strong>{cards.find((c) => c.id === selectedCardId)?.title}</strong>. Nem toda evidência
          disponível serve de prova — algumas são enganosas.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {evidences.map((evidence) => {
            const active = selectedAssociations.has(evidence.id);
            return (
              <button
                key={evidence.id}
                type="button"
                disabled={disabled || !selectedCardId}
                onClick={() => onToggle(selectedCardId, evidence.id)}
                className={clsx(
                  "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-gold-500 bg-gold-500/10"
                    : "border-ink-900/10 bg-white hover:border-ink-900/20",
                )}
              >
                <span className="font-semibold text-ink-900">{evidence.title}</span>
                <span className="text-ink-700/70">{evidence.description}</span>
                {revealed && (
                  <span
                    className={clsx(
                      "mt-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      STRENGTH_CLASS[evidence.strength],
                    )}
                  >
                    {STRENGTH_LABEL[evidence.strength]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
