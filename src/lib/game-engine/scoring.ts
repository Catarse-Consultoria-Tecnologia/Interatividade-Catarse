import type { Prisma, PrismaClient, ScoreCategory } from "@prisma/client";
import { fuzzyMatches } from "./text-match";

type Tx = Prisma.TransactionClient | PrismaClient;

interface CardWithAnswer {
  id: string;
  answer: { zoneId: string; score: number; acceptsInsufficientAsCorrect: boolean } | null;
}

interface ZoneLite {
  id: string;
  isFallback: boolean;
}

async function insertScore(
  tx: Tx,
  entries: {
    sessionId: string;
    participantId: string;
    category: ScoreCategory;
    points: number;
    cardId?: string | null;
    note?: string | null;
  }[],
) {
  if (entries.length === 0) return;
  await tx.scoreEntry.createMany({ data: entries });
}

/** Remove pontuações antigas dessa(s) categoria(s) para a sessão, permitindo recomputar sem duplicar. */
async function clearCategories(tx: Tx, sessionId: string, categories: ScoreCategory[]) {
  await tx.scoreEntry.deleteMany({ where: { sessionId, category: { in: categories } } });
}

/**
 * Rodada 2 (pistas) revelada: pontua a classificação de cada carta do baralho principal
 * usando o posicionamento mais recente de cada participante até este momento.
 */
export async function scoreMainBoardReveal(
  tx: Tx,
  sessionId: string,
  cards: CardWithAnswer[],
  zones: ZoneLite[],
) {
  await clearCategories(tx, sessionId, ["CLASSIFICATION_CORRECT", "INSUFFICIENT_CORRECT"]);

  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const latestPlacements = await tx.placement.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  // Mantém só o posicionamento mais recente por (participante, carta).
  const latestByKey = new Map<string, (typeof latestPlacements)[number]>();
  for (const p of latestPlacements) {
    latestByKey.set(`${p.participantId}:${p.cardId}`, p);
  }

  const entries: Parameters<typeof insertScore>[1] = [];
  for (const placement of latestByKey.values()) {
    const card = cards.find((c) => c.id === placement.cardId);
    if (!card?.answer) continue;
    if (placement.zoneId !== card.answer.zoneId) continue;

    const zone = zoneById.get(card.answer.zoneId);
    entries.push({
      sessionId,
      participantId: placement.participantId,
      cardId: card.id,
      category: zone?.isFallback ? "INSUFFICIENT_CORRECT" : "CLASSIFICATION_CORRECT",
      points: card.answer.score,
    });
  }

  await insertScore(tx, entries);
}

interface EvidenceLite {
  id: string;
  strength: "STRONG" | "COMPLEMENTARY" | "WEAK" | "DECOY";
}

/**
 * Rodada 3 (mesa de evidências) revelada: premia cartas em que o participante associou
 * pelo menos uma evidência forte/complementar e nenhuma evidência enganosa (EF-01 §22-23).
 */
export async function scoreEvidenceReveal(
  tx: Tx,
  sessionId: string,
  evidences: EvidenceLite[],
) {
  await clearCategories(tx, sessionId, ["EVIDENCE_CORRECT"]);

  const evidenceById = new Map(evidences.map((e) => [e.id, e]));
  const associations = await tx.evidenceAssociation.findMany({ where: { sessionId } });

  const byParticipantCard = new Map<string, string[]>();
  for (const a of associations) {
    const key = `${a.participantId}:${a.cardId}`;
    const list = byParticipantCard.get(key) ?? [];
    list.push(a.evidenceId);
    byParticipantCard.set(key, list);
  }

  const entries: Parameters<typeof insertScore>[1] = [];
  for (const [key, evidenceIds] of byParticipantCard.entries()) {
    const [participantId, cardId] = key.split(":");
    if (!participantId || !cardId) continue;
    const strengths = evidenceIds.map((id) => evidenceById.get(id)?.strength);
    const hasDecoy = strengths.includes("DECOY");
    const hasStrongOrComplementary = strengths.some(
      (s) => s === "STRONG" || s === "COMPLEMENTARY",
    );
    if (hasStrongOrComplementary && !hasDecoy) {
      entries.push({
        sessionId,
        participantId,
        cardId,
        category: "EVIDENCE_CORRECT",
        points: 50,
      });
    }
  }

  await insertScore(tx, entries);
}

interface ScenarioItemLite {
  id: string;
  expectedResponsavel: string;
  expectedTipo: string;
  expectedSupervisor: string;
  expectedEvidenceKey: string | null;
  insufficientIsValid: boolean;
}

/** Rodada 4 (caso Aurora) revelada: pontua cada linha da matriz preenchida. */
export async function scoreScenarioReveal(
  tx: Tx,
  sessionId: string,
  items: ScenarioItemLite[],
) {
  await clearCategories(tx, sessionId, [
    "CLASSIFICATION_CORRECT",
    "SUPERVISOR_CORRECT",
    "EVIDENCE_CORRECT",
    "INSUFFICIENT_CORRECT",
    "GOOD_JUSTIFICATION",
  ]);

  const responses = await tx.scenarioResponse.findMany({ where: { sessionId } });
  const itemById = new Map(items.map((i) => [i.id, i]));

  const entries: Parameters<typeof insertScore>[1] = [];
  for (const response of responses) {
    const item = itemById.get(response.scenarioItemId);
    if (!item) continue;

    if (response.markedInsufficient) {
      if (item.insufficientIsValid) {
        entries.push({
          sessionId,
          participantId: response.participantId,
          category: "INSUFFICIENT_CORRECT",
          points: 100,
          note: `Linha "${response.scenarioItemId}" — reconheceu evidência insuficiente corretamente.`,
        });
      }
      if ((response.justification ?? "").trim().length >= 8) {
        entries.push({
          sessionId,
          participantId: response.participantId,
          category: "GOOD_JUSTIFICATION",
          points: 50,
        });
      }
      continue;
    }

    if (response.responsavel && fuzzyMatches(response.responsavel, item.expectedResponsavel)) {
      entries.push({
        sessionId,
        participantId: response.participantId,
        category: "CLASSIFICATION_CORRECT",
        points: 100,
      });
    }
    if (response.tipo && fuzzyMatches(response.tipo, item.expectedTipo)) {
      entries.push({
        sessionId,
        participantId: response.participantId,
        category: "CLASSIFICATION_CORRECT",
        points: 50,
      });
    }
    if (response.supervisor && fuzzyMatches(response.supervisor, item.expectedSupervisor)) {
      entries.push({
        sessionId,
        participantId: response.participantId,
        category: "SUPERVISOR_CORRECT",
        points: 50,
      });
    }
    if (
      item.expectedEvidenceKey &&
      response.evidence &&
      response.evidence === item.expectedEvidenceKey
    ) {
      entries.push({
        sessionId,
        participantId: response.participantId,
        category: "EVIDENCE_CORRECT",
        points: 50,
      });
    }
    if ((response.justification ?? "").trim().length >= 8) {
      entries.push({
        sessionId,
        participantId: response.participantId,
        category: "GOOD_JUSTIFICATION",
        points: 50,
      });
    }
  }

  await insertScore(tx, entries);
}
