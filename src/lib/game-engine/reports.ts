import type { Prisma, PrismaClient } from "@prisma/client";
import type { ClassReportDTO, IndividualReportDTO } from "@/types/realtime";

type Tx = Prisma.TransactionClient | PrismaClient;

interface CardLite {
  id: string;
  title: string;
  answer: { zoneId: string; acceptsInsufficientAsCorrect: boolean } | null;
}

interface ZoneLite {
  id: string;
  name: string;
}

export async function computeIndividualReport(
  tx: Tx,
  sessionId: string,
  participantId: string,
  cards: CardLite[],
  zones: ZoneLite[],
): Promise<IndividualReportDTO> {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const placements = await tx.placement.findMany({
    where: { sessionId, participantId },
    orderBy: { createdAt: "asc" },
  });
  const scoreEntries = await tx.scoreEntry.findMany({ where: { sessionId, participantId } });
  const badgeRows = await tx.participantBadge.findMany({
    where: { sessionId, participantId },
    include: { badge: true },
  });

  const distinctCards = new Set(placements.map((p) => p.cardId));
  const revised = placements.filter((p) => p.isRevision);

  const evidencesCorrect = scoreEntries.filter((s) => s.category === "EVIDENCE_CORRECT").length;
  const insufficientCorrect = scoreEntries.filter((s) => s.category === "INSUFFICIENT_CORRECT").length;
  const classificationCorrect = scoreEntries.filter((s) => s.category === "CLASSIFICATION_CORRECT").length;
  const totalScore = scoreEntries.reduce((sum, s) => sum + s.points, 0);

  const mainDeckCards = cards.filter((c) => c.answer);
  const institutionalReadingPercent =
    mainDeckCards.length === 0
      ? 0
      : Math.round(((classificationCorrect + insufficientCorrect) / mainDeckCards.length) * 100);

  const firstByCard = new Map<string, (typeof placements)[number]>();
  const lastByCard = new Map<string, (typeof placements)[number]>();
  for (const p of placements) {
    if (!firstByCard.has(p.cardId)) firstByCard.set(p.cardId, p);
    lastByCard.set(p.cardId, p);
  }

  const revisionHighlights = revised.slice(0, 3).map((p) => {
    const card = cardById.get(p.cardId);
    const first = firstByCard.get(p.cardId);
    const fromZone = first ? zoneById.get(first.zoneId)?.name : undefined;
    const toZone = zoneById.get(p.zoneId)?.name;
    return {
      cardTitle: card?.title ?? "Carta",
      from: fromZone ?? "—",
      to: toZone ?? "—",
    };
  });

  return {
    hypothesesAnalyzed: distinctCards.size,
    hypothesesRevised: revised.length,
    evidencesCorrect,
    insufficientCorrect,
    institutionalReadingPercent,
    totalScore,
    badges: badgeRows.map((b) => ({
      key: b.badge.key,
      title: b.badge.title,
      description: b.badge.description,
    })),
    revisionHighlights,
  };
}

export async function computeClassReport(
  tx: Tx,
  sessionId: string,
  cards: CardLite[],
): Promise<ClassReportDTO> {
  const participants = await tx.participant.findMany({ where: { sessionId, removed: false } });
  const total = participants.length;

  const placements = await tx.placement.findMany({ where: { sessionId } });
  const latestByKey = new Map<string, (typeof placements)[number]>();
  for (const p of placements.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    latestByKey.set(`${p.participantId}:${p.cardId}`, p);
  }

  const mainDeckCards = cards.filter((c) => c.answer);
  const perCard = mainDeckCards.map((card) => {
    let correct = 0;
    for (const participant of participants) {
      const placement = latestByKey.get(`${participant.id}:${card.id}`);
      if (placement && placement.zoneId === card.answer?.zoneId) correct += 1;
    }
    const correctPercent = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { cardId: card.id, cardTitle: card.title, correctPercent };
  });

  const answeredCards = perCard.filter((c) => c.correctPercent > 0 || total > 0);
  const sortedDesc = [...answeredCards].sort((a, b) => b.correctPercent - a.correctPercent);
  const sortedAsc = [...answeredCards].sort((a, b) => a.correctPercent - b.correctPercent);

  const scoreEntries = await tx.scoreEntry.findMany({ where: { sessionId } });
  const scoreByParticipant = new Map<string, number>();
  for (const s of scoreEntries) {
    scoreByParticipant.set(s.participantId, (scoreByParticipant.get(s.participantId) ?? 0) + s.points);
  }
  const averageScore =
    total === 0
      ? 0
      : Math.round(
          participants.reduce((sum, p) => sum + (scoreByParticipant.get(p.id) ?? 0), 0) / total,
        );

  const insufficientEligibleCards = mainDeckCards.filter((c) => c.answer?.acceptsInsufficientAsCorrect);
  const insufficientCorrectCount = scoreEntries.filter((s) => s.category === "INSUFFICIENT_CORRECT").length;
  const insufficientOpportunities = insufficientEligibleCards.length * total;
  const insufficientRecognitionRate =
    insufficientOpportunities === 0
      ? 0
      : Math.round((insufficientCorrectCount / insufficientOpportunities) * 100);

  const revisionRate =
    placements.length === 0
      ? 0
      : Math.round((placements.filter((p) => p.isRevision).length / placements.length) * 100);

  return {
    totalParticipants: total,
    mostConsolidated: sortedDesc.slice(0, 3),
    mostDivergent: sortedAsc.slice(0, 3),
    averageScore,
    insufficientRecognitionRate,
    revisionRate,
  };
}
