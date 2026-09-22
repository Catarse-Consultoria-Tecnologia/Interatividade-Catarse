import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * EF-01 §30 — Distintivos: reconhecem qualidade de investigação, não velocidade (RN-008).
 * Concede cada distintivo a todos os participantes empatados no topo daquele critério.
 */
export async function computeAndAwardBadges(tx: Tx, sessionId: string, gameId: string) {
  await tx.participantBadge.deleteMany({ where: { sessionId } });

  const badges = await tx.badge.findMany({ where: { gameId } });
  const badgeByKey = Object.fromEntries(badges.map((b) => [b.key, b]));

  const participants = await tx.participant.findMany({
    where: { sessionId, removed: false },
  });
  if (participants.length === 0) return;

  const scoreEntries = await tx.scoreEntry.findMany({ where: { sessionId } });
  const placements = await tx.placement.findMany({ where: { sessionId } });
  const evidenceAssociations = await tx.evidenceAssociation.findMany({
    where: { sessionId },
    include: { evidence: true },
  });
  const scenarioResponses = await tx.scenarioResponse.findMany({ where: { sessionId } });

  function countBy<T extends { participantId: string }>(
    predicate: (v: T) => boolean,
    source: T[],
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of source) {
      if (!predicate(item)) continue;
      map.set(item.participantId, (map.get(item.participantId) ?? 0) + 1);
    }
    return map;
  }

  const evidenceCorrectByParticipant = countBy(
    (e) => e.category === "EVIDENCE_CORRECT",
    scoreEntries,
  );
  const classificationCorrectByParticipant = countBy(
    (e) => e.category === "CLASSIFICATION_CORRECT",
    scoreEntries,
  );
  const insufficientCorrectByParticipant = countBy(
    // Reconhecer evidência insuficiente é testado tanto no baralho principal (Rodada 2)
    // quanto no dossiê Aurora (Rodada 4) — as duas contam pra esse distintivo.
    (e) => e.category === "INSUFFICIENT_CORRECT" || e.category === "SCENARIO_INSUFFICIENT_CORRECT",
    scoreEntries,
  );
  const revisionsByParticipant = countBy((p) => p.isRevision, placements);

  const decoyByParticipant = new Map<string, number>();
  const totalEvidenceByParticipant = new Map<string, number>();
  for (const assoc of evidenceAssociations) {
    totalEvidenceByParticipant.set(
      assoc.participantId,
      (totalEvidenceByParticipant.get(assoc.participantId) ?? 0) + 1,
    );
    if (assoc.evidence.strength === "DECOY") {
      decoyByParticipant.set(assoc.participantId, (decoyByParticipant.get(assoc.participantId) ?? 0) + 1);
    }
  }

  const distinctCardsByParticipant = new Map<string, Set<string>>();
  for (const p of placements) {
    const set = distinctCardsByParticipant.get(p.participantId) ?? new Set<string>();
    set.add(p.cardId);
    distinctCardsByParticipant.set(p.participantId, set);
  }
  const scenarioCountByParticipant = countBy(() => true, scenarioResponses);

  function topParticipants(valueFor: (participantId: string) => number): string[] {
    const withValues = participants.map((p) => ({ id: p.id, value: valueFor(p.id) }));
    const max = Math.max(...withValues.map((v) => v.value));
    if (max <= 0) return [];
    return withValues.filter((v) => v.value === max).map((v) => v.id);
  }

  const awards: { badgeKey: string; participantIds: string[] }[] = [
    {
      badgeKey: "investigador-evidencias",
      participantIds: topParticipants((id) => evidenceCorrectByParticipant.get(id) ?? 0),
    },
    {
      badgeKey: "melhor-leitura",
      participantIds: topParticipants((id) => classificationCorrectByParticipant.get(id) ?? 0),
    },
    {
      badgeKey: "melhor-evidencias",
      // menos evidências enganosas escolhidas, entre quem participou da mesa de evidências
      participantIds: topParticipants((id) => {
        const total = totalEvidenceByParticipant.get(id) ?? 0;
        if (total === 0) return 0;
        const decoys = decoyByParticipant.get(id) ?? 0;
        return total - decoys * 2; // penaliza escolhas enganosas mais do que valoriza volume
      }),
    },
    {
      badgeKey: "investigador-cauteloso",
      participantIds: topParticipants((id) => insufficientCorrectByParticipant.get(id) ?? 0),
    },
    {
      badgeKey: "maior-evolucao",
      participantIds: topParticipants((id) => revisionsByParticipant.get(id) ?? 0),
    },
    {
      badgeKey: "mapa-completo",
      participantIds: topParticipants((id) => {
        const cards = distinctCardsByParticipant.get(id)?.size ?? 0;
        const scenario = scenarioCountByParticipant.get(id) ?? 0;
        const evidence = totalEvidenceByParticipant.get(id) ?? 0;
        return cards + scenario + evidence;
      }),
    },
  ];

  const rows: Prisma.ParticipantBadgeCreateManyInput[] = [];
  for (const award of awards) {
    const badge = badgeByKey[award.badgeKey];
    if (!badge) continue;
    for (const participantId of award.participantIds) {
      rows.push({ sessionId, participantId, badgeId: badge.id });
    }
  }
  if (rows.length > 0) {
    await tx.participantBadge.createMany({ data: rows, skipDuplicates: true });
  }
}
