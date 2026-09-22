"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { CardDTO, EvidenceDTO, EvidenceMatchBatchDTO } from "@/types/realtime";

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function EvidenceMatching({
  cards,
  evidences,
  batches,
  associationsByCard,
  onMatch,
  revealed,
  disabled,
}: {
  cards: CardDTO[];
  evidences: EvidenceDTO[];
  batches: EvidenceMatchBatchDTO[];
  associationsByCard: Map<string, Set<string>>;
  onMatch: (cardId: string, evidenceId: string) => Promise<boolean>;
  revealed: boolean;
  disabled?: boolean;
}) {
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const evidenceById = useMemo(() => new Map(evidences.map((e) => [e.id, e])), [evidences]);

  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ evidenceId: string; cardId: string } | null>(null);
  // Correspondências confirmadas nesta sessão de montagem, adicionadas na hora (o `associationsByCard`
  // vindo por prop pode demorar um instante pra refletir, via refetch/realtime).
  const [localOptimistic, setLocalOptimistic] = useState<Map<string, string>>(new Map());

  const matchedCardIds = useMemo(() => {
    const set = new Set([...associationsByCard.entries()].filter(([, s]) => s.size > 0).map(([cardId]) => cardId));
    for (const cardId of localOptimistic.keys()) set.add(cardId);
    return set;
  }, [associationsByCard, localOptimistic]);

  const usedEvidenceIds = useMemo(() => {
    const set = new Set<string>();
    for (const evidenceSet of associationsByCard.values()) {
      for (const evidenceId of evidenceSet) set.add(evidenceId);
    }
    for (const evidenceId of localOptimistic.values()) set.add(evidenceId);
    return set;
  }, [associationsByCard, localOptimistic]);

  const firstIncompleteBatch = batches.findIndex((b) => b.cardIds.some((id) => !matchedCardIds.has(id)));
  const [batchIndex, setBatchIndex] = useState(() =>
    firstIncompleteBatch === -1 ? Math.max(0, batches.length - 1) : firstIncompleteBatch,
  );
  const batch = batches[batchIndex];

  const orderRef = useRef<Map<number, { cardIds: string[]; evidenceIds: string[] }>>(new Map());
  if (batch && !orderRef.current.has(batchIndex)) {
    orderRef.current.set(batchIndex, {
      cardIds: shuffled(batch.cardIds),
      evidenceIds: shuffled(batch.evidenceIds),
    });
  }
  const order = batch ? orderRef.current.get(batchIndex)! : null;

  if (!batch || !order) {
    return (
      <div className="dossier-card p-5 text-center text-sm text-ink-700">
        Nenhuma associação disponível nesta rodada.
      </div>
    );
  }

  const isCardMatched = (cardId: string) => matchedCardIds.has(cardId) || localOptimistic.has(cardId);
  const batchComplete = batch.cardIds.every((id) => isCardMatched(id));
  const isLastBatch = batchIndex === batches.length - 1;

  async function handleEvidenceTap(evidenceId: string) {
    if (disabled || revealed || pending) return;
    setSelectedEvidenceId((prev) => (prev === evidenceId ? null : evidenceId));
  }

  async function handleInstitutionTap(cardId: string) {
    if (disabled || revealed || pending || isCardMatched(cardId) || !selectedEvidenceId) return;
    const evidenceId = selectedEvidenceId;
    setPending(true);
    try {
      const correct = await onMatch(cardId, evidenceId);
      if (correct) {
        setLocalOptimistic((prev) => new Map(prev).set(cardId, evidenceId));
        setSelectedEvidenceId(null);
      } else {
        setWrongFlash({ cardId, evidenceId });
        setTimeout(() => setWrongFlash(null), 450);
        setSelectedEvidenceId(null);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="cork-panel p-3.5">
        <p className="label-eyebrow mb-1">
          Grupo {batchIndex + 1} de {batches.length}
        </p>
        <ol className="list-decimal space-y-0.5 pl-4 text-sm text-paper-300/80">
          <li>
            Toque numa evidência, na coluna da esquerda (ela fica destacada em dourado).
          </li>
          <li>
            Depois toque na instituição, na coluna da direita, que você acha que essa evidência comprova.
          </li>
          <li>
            Acertou: os dois ficam marcados com ✓ e travados. Errou: os dois piscam em vermelho e você
            tenta de novo — sem problema.
          </li>
        </ol>
        <p className="mt-2 text-xs text-paper-300/60">
          Atenção: uma das evidências deste grupo não combina com nenhuma instituição aqui — reconhecer
          qual é também faz parte do desafio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="label-eyebrow">Evidências</p>
          {order.evidenceIds.map((evidenceId) => {
            const evidence = evidenceById.get(evidenceId);
            if (!evidence) return null;
            const used = usedEvidenceIds.has(evidenceId);
            const selected = selectedEvidenceId === evidenceId;
            const isWrong = wrongFlash?.evidenceId === evidenceId;
            return (
              <button
                key={evidenceId}
                type="button"
                data-testid={`evidence-chip-${evidence.key}`}
                disabled={disabled || revealed || used || pending}
                onClick={() => handleEvidenceTap(evidenceId)}
                className={clsx(
                  "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed",
                  used
                    ? "border-confirm-500/40 bg-confirm-500/10 opacity-60"
                    : selected
                      ? "border-gold-500 bg-gold-500/10"
                      : isWrong
                        ? "border-alert-500 bg-alert-500/10"
                        : "border-white/15 bg-white/5 hover:bg-white/10",
                )}
              >
                <span className="font-semibold text-paper-50">{evidence.title}</span>
                <span className="text-paper-300/70">{evidence.description}</span>
                {used && <span className="mt-1 text-[10px] font-bold uppercase text-confirm-400">✓ combinado</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="label-eyebrow">Instituições</p>
          {order.cardIds.map((cardId) => {
            const card = cardById.get(cardId);
            if (!card) return null;
            const matched = isCardMatched(cardId);
            const isWrong = wrongFlash?.cardId === cardId;
            return (
              <button
                key={cardId}
                type="button"
                data-testid={`institution-chip-${card.key}`}
                disabled={disabled || revealed || matched || pending || !selectedEvidenceId}
                onClick={() => handleInstitutionTap(cardId)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed",
                  matched
                    ? "border-confirm-500/40 bg-confirm-500/10 text-confirm-400 opacity-80"
                    : isWrong
                      ? "border-alert-500 bg-alert-500/10 text-paper-50"
                      : "border-white/15 bg-white/5 text-paper-50 hover:bg-white/10 disabled:opacity-50",
                )}
              >
                <span>{card.title}</span>
                {matched && <span>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        {batchComplete && !isLastBatch && (
          <button
            type="button"
            data-testid="proximo-grupo"
            className="btn-primary"
            onClick={() => {
              setBatchIndex((i) => i + 1);
              setSelectedEvidenceId(null);
            }}
          >
            Próximo grupo →
          </button>
        )}
        {batchComplete && isLastBatch && (
          <p className="text-sm font-semibold text-confirm-400">
            Todos os grupos concluídos — aguarde o professor avançar a rodada.
          </p>
        )}
      </div>
    </div>
  );
}
