import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateSecretToken } from "./codes";
import { loadGameContentById, loadGameContentBySlug, primaryScenario, type GameContent } from "./content";
import { assertTransition, InvalidTransitionError } from "./state-machine";
import { scoreEvidenceReveal, scoreMainBoardReveal, scoreScenarioReveal } from "./scoring";
import { computeAndAwardBadges } from "./badges";
import { computeClassReport, computeIndividualReport } from "./reports";
import type {
  CardDistributionDTO,
  CardDTO,
  GameContentDTO,
  MyStateDTO,
  ProfessorActionType,
  ProfessorParticipantRowDTO,
  ProfessorStateDTO,
  PublicRoomState,
  TimelineEventDTO,
} from "@/types/realtime";
import type { Prisma, Session } from "@prisma/client";

export class GameServiceError extends Error {
  constructor(message: string, public code: string = "GAME_ERROR") {
    super(message);
  }
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome.")
  .max(40, "Nome muito longo.");

const freeTextSchema = z.string().trim().max(500).optional();

// ---------------------------------------------------------------------------
// Criação e ingresso
// ---------------------------------------------------------------------------

export async function createSession(gameSlug: string) {
  const game = await loadGameContentBySlug(gameSlug);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode(game.slug);
    const hostToken = generateSecretToken();
    try {
      const session = await prisma.session.create({
        data: {
          gameId: game.id,
          code,
          hostToken,
          status: "LOBBY",
          totalRounds: 4,
        },
      });
      await prisma.sessionEvent.create({
        data: { sessionId: session.id, type: "SESSION_CREATED" },
      });
      return { code: session.code, hostToken: session.hostToken, sessionId: session.id };
    } catch (err) {
      // colisão de código (rara) — tenta de novo com um novo código
      if (attempt === 4) throw err;
    }
  }
  throw new GameServiceError("Não foi possível criar a sala. Tente novamente.");
}

async function requireSession(code: string): Promise<Session> {
  const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) throw new GameServiceError("Sala não encontrada.", "NOT_FOUND");
  return session;
}

export async function joinParticipant(
  code: string,
  rawName: string,
  existingToken?: string,
) {
  const session = await requireSession(code);
  if (session.status === "CLOSED") {
    throw new GameServiceError("Esta sala já foi encerrada.", "CLOSED");
  }

  if (existingToken) {
    const existing = await prisma.participant.findFirst({
      where: { sessionId: session.id, token: existingToken },
    });
    if (existing && !existing.removed) {
      await prisma.participant.update({
        where: { id: existing.id },
        data: { connected: true, lastSeenAt: new Date() },
      });
      return { token: existing.token, participantId: existing.id, sessionId: session.id };
    }
  }

  if (session.lobbyLocked) {
    throw new GameServiceError(
      "O professor bloqueou a entrada de novos participantes nesta sala.",
      "LOBBY_LOCKED",
    );
  }

  const name = nameSchema.parse(rawName);
  const token = generateSecretToken();
  const participant = await prisma.participant.create({
    data: { sessionId: session.id, name, token },
  });
  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: "PARTICIPANT_JOINED",
      participantId: participant.id,
    },
  });

  return { token, participantId: participant.id, sessionId: session.id };
}

export async function authenticateProfessor(code: string, hostToken: string) {
  const session = await requireSession(code);
  if (session.hostToken !== hostToken) {
    throw new GameServiceError("Token de professor inválido para esta sala.", "FORBIDDEN");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Ações do participante durante o jogo
// ---------------------------------------------------------------------------

async function requireParticipant(sessionId: string, token: string) {
  const participant = await prisma.participant.findFirst({
    where: { sessionId, token, removed: false },
  });
  if (!participant) throw new GameServiceError("Participante não encontrado nesta sala.", "FORBIDDEN");
  return participant;
}

export async function placeCard(code: string, token: string, cardId: string, zoneId: string) {
  const session = await requireSession(code);
  const participant = await requireParticipant(session.id, token);

  if (session.status !== "ROUND_OPEN" || ![1, 2].includes(session.currentRound)) {
    throw new GameServiceError(
      "O tabuleiro só aceita novos posicionamentos durante as rodadas 1 e 2, com a rodada aberta.",
      "INVALID_STATE",
    );
  }

  const content = await loadGameContentById(session.gameId);
  const card = content.cards.find((c) => c.id === cardId);
  const zone = content.zones.find((z) => z.id === zoneId);
  if (!card || !zone) throw new GameServiceError("Carta ou zona inválida.", "BAD_REQUEST");

  const previous = await prisma.placement.findFirst({
    where: { sessionId: session.id, participantId: participant.id, cardId },
    orderBy: { createdAt: "desc" },
  });
  const isRevision = Boolean(previous);

  await prisma.placement.create({
    data: {
      sessionId: session.id,
      participantId: participant.id,
      cardId,
      zoneId,
      round: session.currentRound,
      isRevision,
    },
  });

  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: isRevision ? "HYPOTHESIS_REVISED" : "HYPOTHESIS_REGISTERED",
      participantId: participant.id,
      cardId,
      payload: { zoneKey: zone.key, previousZoneId: previous?.zoneId ?? null },
    },
  });

  return { isRevision };
}

export async function toggleEvidence(code: string, token: string, cardId: string, evidenceId: string) {
  const session = await requireSession(code);
  const participant = await requireParticipant(session.id, token);

  if (session.status !== "ROUND_OPEN" || session.currentRound !== 3) {
    throw new GameServiceError(
      "A mesa de evidências só está disponível durante a rodada 3, com a rodada aberta.",
      "INVALID_STATE",
    );
  }

  const content = await loadGameContentById(session.gameId);
  const card = content.cards.find((c) => c.id === cardId);
  const evidence = content.evidences.find((e) => e.id === evidenceId);
  if (!card || !evidence) throw new GameServiceError("Carta ou evidência inválida.", "BAD_REQUEST");

  const existing = await prisma.evidenceAssociation.findUnique({
    where: {
      sessionId_participantId_cardId_evidenceId: {
        sessionId: session.id,
        participantId: participant.id,
        cardId,
        evidenceId,
      },
    },
  });

  if (existing) {
    await prisma.evidenceAssociation.delete({ where: { id: existing.id } });
    return { associated: false };
  }

  await prisma.evidenceAssociation.create({
    data: { sessionId: session.id, participantId: participant.id, cardId, evidenceId },
  });
  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: "EVIDENCE_ASSOCIATED",
      participantId: participant.id,
      cardId,
      payload: { evidenceKey: evidence.key, strength: evidence.strength },
    },
  });
  return { associated: true };
}

const scenarioResponseSchema = z.object({
  responsavel: freeTextSchema,
  tipo: freeTextSchema,
  supervisor: freeTextSchema,
  evidenceKey: z.string().trim().max(80).nullish(),
  markedInsufficient: z.boolean().optional(),
  justification: freeTextSchema,
});

export async function respondScenarioItem(
  code: string,
  token: string,
  scenarioItemId: string,
  raw: z.infer<typeof scenarioResponseSchema>,
) {
  const session = await requireSession(code);
  const participant = await requireParticipant(session.id, token);

  if (session.status !== "ROUND_OPEN" || session.currentRound !== 4) {
    throw new GameServiceError(
      "O dossiê Aurora só está disponível durante a rodada 4, com a rodada aberta.",
      "INVALID_STATE",
    );
  }

  const payload = scenarioResponseSchema.parse(raw);
  const content = await loadGameContentById(session.gameId);
  const scenario = primaryScenario(content);
  const item = scenario.items.find((i) => i.id === scenarioItemId);
  if (!item) throw new GameServiceError("Linha da matriz inválida.", "BAD_REQUEST");

  await prisma.scenarioResponse.upsert({
    where: {
      sessionId_participantId_scenarioItemId: {
        sessionId: session.id,
        participantId: participant.id,
        scenarioItemId,
      },
    },
    create: {
      sessionId: session.id,
      participantId: participant.id,
      scenarioItemId,
      responsavel: payload.responsavel ?? "",
      tipo: payload.tipo ?? "",
      supervisor: payload.supervisor ?? "",
      evidence: payload.evidenceKey ?? null,
      markedInsufficient: payload.markedInsufficient ?? false,
      justification: payload.justification ?? "",
    },
    update: {
      ...(payload.responsavel !== undefined ? { responsavel: payload.responsavel } : {}),
      ...(payload.tipo !== undefined ? { tipo: payload.tipo } : {}),
      ...(payload.supervisor !== undefined ? { supervisor: payload.supervisor } : {}),
      ...(payload.evidenceKey !== undefined ? { evidence: payload.evidenceKey } : {}),
      ...(payload.markedInsufficient !== undefined
        ? { markedInsufficient: payload.markedInsufficient }
        : {}),
      ...(payload.justification !== undefined ? { justification: payload.justification } : {}),
    },
  });

  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: "SCENARIO_RESPONSE_SAVED",
      participantId: participant.id,
      payload: { scenarioItemId, service: item.service },
    },
  });
}

// ---------------------------------------------------------------------------
// Ações do professor
// ---------------------------------------------------------------------------

export async function runProfessorAction(
  code: string,
  hostToken: string,
  action: ProfessorActionType,
  payload: Record<string, unknown> = {},
) {
  const session = await authenticateProfessor(code, hostToken);

  try {
    assertTransition(session.status, action);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new GameServiceError(err.message, "INVALID_STATE");
    }
    throw err;
  }

  const content = await loadGameContentById(session.gameId);

  await prisma.$transaction(async (tx) => {
    switch (action) {
      case "START": {
        await tx.session.update({ where: { id: session.id }, data: { status: "BRIEFING" } });
        break;
      }
      case "NEXT_ROUND": {
        const nextRound = session.status === "BRIEFING" ? 1 : session.currentRound + 1;
        if (nextRound > session.totalRounds) {
          await finishSession(tx, session, content);
        } else {
          await tx.session.update({
            where: { id: session.id },
            data: {
              status: "ROUND_OPEN",
              currentRound: nextRound,
              distributionVisible: false,
              roundTimerEndsAt: null,
            },
          });
          await tx.sessionEvent.create({
            data: { sessionId: session.id, type: "ROUND_ADVANCED", payload: { round: nextRound } },
          });
        }
        break;
      }
      case "RELEASE_CLUE": {
        const cardId = typeof payload.cardId === "string" ? payload.cardId : undefined;
        await releaseClue(tx, session.id, content, cardId);
        break;
      }
      case "FREEZE":
      case "PAUSE": {
        await tx.session.update({ where: { id: session.id }, data: { status: "ROUND_FROZEN" } });
        await tx.sessionEvent.create({
          data: { sessionId: session.id, type: "ROUND_FROZEN", payload: { round: session.currentRound } },
        });
        break;
      }
      case "RESUME": {
        await tx.session.update({ where: { id: session.id }, data: { status: "ROUND_OPEN" } });
        await tx.sessionEvent.create({
          data: { sessionId: session.id, type: "ROUND_RESUMED", payload: { round: session.currentRound } },
        });
        break;
      }
      case "SHOW_DISTRIBUTION": {
        await tx.session.update({
          where: { id: session.id },
          data: { distributionVisible: !session.distributionVisible },
        });
        break;
      }
      case "REVEAL": {
        await revealRound(tx, session, content);
        break;
      }
      case "LOCK_LOBBY":
        await tx.session.update({ where: { id: session.id }, data: { lobbyLocked: true } });
        break;
      case "UNLOCK_LOBBY":
        await tx.session.update({ where: { id: session.id }, data: { lobbyLocked: false } });
        break;
      case "TOGGLE_SOUND":
        await tx.session.update({ where: { id: session.id }, data: { soundEnabled: !session.soundEnabled } });
        break;
      case "SET_TIMER": {
        const seconds = typeof payload.seconds === "number" ? payload.seconds : 0;
        if (seconds <= 0 || seconds > 60 * 60) {
          throw new GameServiceError("Duração de cronômetro inválida.", "BAD_REQUEST");
        }
        await tx.session.update({
          where: { id: session.id },
          data: { roundTimerEndsAt: new Date(Date.now() + seconds * 1000) },
        });
        break;
      }
      case "CLEAR_TIMER": {
        await tx.session.update({ where: { id: session.id }, data: { roundTimerEndsAt: null } });
        break;
      }
      case "REMOVE_PARTICIPANT": {
        const participantId = typeof payload.participantId === "string" ? payload.participantId : undefined;
        if (!participantId) throw new GameServiceError("participantId é obrigatório.", "BAD_REQUEST");
        await tx.participant.update({ where: { id: participantId }, data: { removed: true } });
        await tx.sessionEvent.create({
          data: { sessionId: session.id, type: "PARTICIPANT_REMOVED", participantId },
        });
        break;
      }
      case "RENAME_PARTICIPANT": {
        const participantId = typeof payload.participantId === "string" ? payload.participantId : undefined;
        const newName = typeof payload.name === "string" ? nameSchema.parse(payload.name) : undefined;
        if (!participantId || !newName) {
          throw new GameServiceError("participantId e name são obrigatórios.", "BAD_REQUEST");
        }
        await tx.participant.update({ where: { id: participantId }, data: { name: newName } });
        await tx.sessionEvent.create({
          data: {
            sessionId: session.id,
            type: "PARTICIPANT_RENAMED",
            participantId,
            payload: { name: newName },
          },
        });
        break;
      }
      case "FINISH": {
        await finishSession(tx, session, content);
        break;
      }
      case "CLOSE": {
        await tx.session.update({
          where: { id: session.id },
          data: { status: "CLOSED", closedAt: new Date() },
        });
        await tx.sessionEvent.create({ data: { sessionId: session.id, type: "SESSION_CLOSED" } });
        break;
      }
      default:
        throw new GameServiceError(`Ação desconhecida: ${action}`, "BAD_REQUEST");
    }
  });
}

async function releaseClue(
  tx: Prisma.TransactionClient,
  sessionId: string,
  content: GameContent,
  cardId: string | undefined,
) {
  const alreadyReleased = await tx.sessionClue.findMany({ where: { sessionId } });
  const releasedClueIds = new Set(alreadyReleased.map((r) => r.clueId));

  let targetCard = cardId ? content.cards.find((c) => c.id === cardId) : undefined;
  if (!targetCard) {
    targetCard = content.cards.find((c) => c.clues.some((clue) => !releasedClueIds.has(clue.id)));
  }
  const clue = targetCard?.clues.find((c) => !releasedClueIds.has(c.id));
  if (!targetCard || !clue) {
    throw new GameServiceError("Não há mais pistas para liberar.", "NO_MORE_CLUES");
  }

  const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
  await tx.sessionClue.create({
    data: { sessionId, clueId: clue.id, round: session.currentRound },
  });
  await tx.sessionEvent.create({
    data: {
      sessionId,
      type: "CLUE_RELEASED",
      cardId: targetCard.id,
      payload: { clueTitle: clue.title },
    },
  });
}

async function revealRound(tx: Prisma.TransactionClient, session: Session, content: GameContent) {
  if (session.currentRound === 2) {
    await scoreMainBoardReveal(tx, session.id, content.cards, content.zones);
  } else if (session.currentRound === 3) {
    await scoreEvidenceReveal(tx, session.id, content.cards, content.evidences);
  } else if (session.currentRound === 4) {
    const scenario = primaryScenario(content);
    await scoreScenarioReveal(tx, session.id, scenario.items);
  }

  await tx.session.update({
    where: { id: session.id },
    data: {
      status: "REVEAL",
      highestRevealedRound: Math.max(session.highestRevealedRound, session.currentRound),
    },
  });
  await tx.sessionEvent.create({
    data: { sessionId: session.id, type: "ROUND_REVEALED", payload: { round: session.currentRound } },
  });
}

async function finishSession(tx: Prisma.TransactionClient, session: Session, content: GameContent) {
  // Garante que toda pontuação pendente da última rodada aberta seja computada antes de fechar.
  if (session.status !== "FINAL") {
    if (session.currentRound === 2) await scoreMainBoardReveal(tx, session.id, content.cards, content.zones);
    if (session.currentRound === 3) await scoreEvidenceReveal(tx, session.id, content.cards, content.evidences);
    if (session.currentRound === 4) {
      const scenario = primaryScenario(content);
      await scoreScenarioReveal(tx, session.id, scenario.items);
    }
  }
  await computeAndAwardBadges(tx, session.id, content.id);
  await tx.session.update({
    where: { id: session.id },
    data: { status: "FINAL", highestRevealedRound: Math.max(session.highestRevealedRound, session.currentRound) },
  });
  await tx.sessionEvent.create({ data: { sessionId: session.id, type: "SESSION_FINISHED" } });
}

// ---------------------------------------------------------------------------
// Montagem de estado (DTOs) para transmitir via socket
// ---------------------------------------------------------------------------

function toGameContentDTO(
  content: GameContent,
  releasedClueIdsByCard: Map<string, Set<string>>,
): GameContentDTO {
  const scenario = primaryScenario(content);
  return {
    id: content.id,
    slug: content.slug,
    name: content.name,
    description: content.description,
    zones: content.zones.map((z) => ({
      id: z.id,
      key: z.key,
      name: z.name,
      subtitle: z.subtitle,
      description: z.description,
      order: z.order,
      isFallback: z.isFallback,
      color: z.color,
    })),
    cards: content.cards.map((c): CardDTO => {
      const released = releasedClueIdsByCard.get(c.id) ?? new Set();
      return {
        id: c.id,
        key: c.key,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        cardType: c.cardType,
        technicalNote: c.technicalNote,
        order: c.order,
        totalClues: c.clues.length,
        releasedClues: c.clues
          .filter((clue) => released.has(clue.id))
          .map((clue) => ({ id: clue.id, order: clue.order, title: clue.title, text: clue.text })),
      };
    }),
    evidences: content.evidences.map((e) => ({
      id: e.id,
      key: e.key,
      title: e.title,
      description: e.description,
      strength: e.strength,
    })),
    scenario: {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      documents: scenario.documents.map((d) => ({ id: d.id, key: d.key, title: d.title, text: d.text })),
      items: scenario.items.map((i) => ({ id: i.id, order: i.order, service: i.service })),
    },
  };
}

async function computeDistribution(
  sessionId: string,
  content: GameContent,
): Promise<CardDistributionDTO[]> {
  const placements = await prisma.placement.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const latestByKey = new Map<string, (typeof placements)[number]>();
  for (const p of placements) latestByKey.set(`${p.participantId}:${p.cardId}`, p);

  const perCard = new Map<string, Record<string, number>>();
  for (const p of latestByKey.values()) {
    const byZone = perCard.get(p.cardId) ?? {};
    byZone[p.zoneId] = (byZone[p.zoneId] ?? 0) + 1;
    perCard.set(p.cardId, byZone);
  }

  return content.cards.map((card) => {
    const byZone = perCard.get(card.id) ?? {};
    const totalAnswers = Object.values(byZone).reduce((a, b) => a + b, 0);
    let topZoneId: string | null = null;
    let topCount = 0;
    for (const [zoneId, count] of Object.entries(byZone)) {
      if (count > topCount) {
        topCount = count;
        topZoneId = zoneId;
      }
    }
    const divergent = totalAnswers > 0 && topCount / totalAnswers < 0.6;
    return { cardId: card.id, totalAnswers, byZone, topZoneId, divergent };
  });
}

async function releasedClueIdsByCard(sessionId: string): Promise<Map<string, Set<string>>> {
  const rows = await prisma.sessionClue.findMany({ where: { sessionId }, include: { clue: true } });
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = map.get(row.clue.cardId) ?? new Set<string>();
    set.add(row.clueId);
    map.set(row.clue.cardId, set);
  }
  return map;
}

export async function buildPublicRoomState(code: string): Promise<PublicRoomState> {
  const session = await requireSession(code);
  const content = await loadGameContentById(session.gameId);
  const releasedMap = await releasedClueIdsByCard(session.id);

  const participants = await prisma.participant.findMany({
    where: { sessionId: session.id, removed: false },
    orderBy: { joinedAt: "asc" },
  });

  const distribution =
    session.distributionVisible || session.status === "REVEAL" || session.status === "FINAL"
      ? await computeDistribution(session.id, content)
      : null;

  let revealedZoneByCard: Record<string, string> | null = null;
  if (session.highestRevealedRound >= 2) {
    revealedZoneByCard = {};
    for (const card of content.cards) {
      if (card.answer) revealedZoneByCard[card.id] = card.answer.zoneId;
    }
  }

  let revealedScenarioAnswers: PublicRoomState["revealedScenarioAnswers"] = null;
  if (session.highestRevealedRound >= 4) {
    const scenario = primaryScenario(content);
    const evidenceByKey = new Map(content.evidences.map((e) => [e.key, e]));
    revealedScenarioAnswers = {};
    for (const item of scenario.items) {
      revealedScenarioAnswers[item.id] = {
        responsavel: item.expectedResponsavel,
        tipo: item.expectedTipo,
        supervisor: item.expectedSupervisor,
        evidenceTitle: item.expectedEvidenceKey
          ? evidenceByKey.get(item.expectedEvidenceKey)?.title ?? null
          : null,
        insufficientIsValid: item.insufficientIsValid,
      };
    }
  }

  let classReport = null;
  if (session.status === "FINAL" || session.status === "CLOSED") {
    classReport = await computeClassReport(prisma, session.id, content.cards);
  }

  return {
    code: session.code,
    status: session.status,
    currentRound: (session.currentRound as 0 | 1 | 2 | 3 | 4) ?? 0,
    totalRounds: session.totalRounds,
    lobbyLocked: session.lobbyLocked,
    soundEnabled: session.soundEnabled,
    distributionVisible: session.distributionVisible,
    participantCount: participants.length,
    participants: participants.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      removed: p.removed,
      joinedAt: p.joinedAt.toISOString(),
    })),
    game: toGameContentDTO(content, releasedMap),
    distribution,
    revealedZoneByCard,
    revealedScenarioAnswers,
    finished: session.status === "FINAL" || session.status === "CLOSED",
    classReport,
    roundTimerEndsAt: session.roundTimerEndsAt ? session.roundTimerEndsAt.toISOString() : null,
  };
}

export async function buildMyState(code: string, token: string): Promise<MyStateDTO> {
  const session = await requireSession(code);
  const participant = await prisma.participant.findFirst({ where: { sessionId: session.id, token } });
  if (!participant) throw new GameServiceError("Participante não encontrado.", "FORBIDDEN");

  const content = await loadGameContentById(session.gameId);

  const placements = await prisma.placement.findMany({
    where: { sessionId: session.id, participantId: participant.id },
    orderBy: { createdAt: "asc" },
  });
  const latestByCard = new Map<string, (typeof placements)[number]>();
  for (const p of placements) latestByCard.set(p.cardId, p);

  const evidenceAssociations = await prisma.evidenceAssociation.findMany({
    where: { sessionId: session.id, participantId: participant.id },
  });
  const evidenceByCard = new Map<string, string[]>();
  for (const e of evidenceAssociations) {
    const list = evidenceByCard.get(e.cardId) ?? [];
    list.push(e.evidenceId);
    evidenceByCard.set(e.cardId, list);
  }

  const scenarioResponses = await prisma.scenarioResponse.findMany({
    where: { sessionId: session.id, participantId: participant.id },
  });

  const scoreEntries = await prisma.scoreEntry.findMany({
    where: { sessionId: session.id, participantId: participant.id },
  });
  const totalScore = scoreEntries.reduce((sum, s) => sum + s.points, 0);

  let report = null;
  if (session.status === "FINAL" || session.status === "CLOSED") {
    report = await computeIndividualReport(prisma, session.id, participant.id, content.cards, content.zones);
  }

  return {
    participantId: participant.id,
    name: participant.name,
    placements: Array.from(latestByCard.values()).map((p) => ({
      cardId: p.cardId,
      zoneId: p.zoneId,
      isRevision: p.isRevision,
      updatedAt: p.createdAt.toISOString(),
    })),
    evidenceAssociations: Array.from(evidenceByCard.entries()).map(([cardId, evidenceIds]) => ({
      cardId,
      evidenceIds,
    })),
    scenarioResponses: scenarioResponses.map((r) => ({
      scenarioItemId: r.scenarioItemId,
      responsavel: r.responsavel ?? "",
      tipo: r.tipo ?? "",
      supervisor: r.supervisor ?? "",
      evidenceKey: r.evidence,
      markedInsufficient: r.markedInsufficient,
      justification: r.justification ?? "",
    })),
    totalScore,
    report,
  };
}

export async function buildProfessorState(code: string, hostToken: string): Promise<ProfessorStateDTO> {
  const session = await authenticateProfessor(code, hostToken);
  const publicState = await buildPublicRoomState(code);
  const content = await loadGameContentById(session.gameId);

  const participants = await prisma.participant.findMany({
    where: { sessionId: session.id, removed: false },
    orderBy: { joinedAt: "asc" },
  });

  const currentRoundAnswerCounts = await currentRoundAnswerCountByParticipant(session, content);
  const scoreEntries = await prisma.scoreEntry.findMany({ where: { sessionId: session.id } });
  const scoreByParticipant = new Map<string, number>();
  for (const s of scoreEntries) {
    scoreByParticipant.set(s.participantId, (scoreByParticipant.get(s.participantId) ?? 0) + s.points);
  }

  const participantsDetailed: ProfessorParticipantRowDTO[] = participants.map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    removed: p.removed,
    answeredCurrentRound: currentRoundAnswerCounts.get(p.id) ?? 0,
    totalScore: scoreByParticipant.get(p.id) ?? 0,
  }));

  const distributionAlways = await computeDistribution(session.id, content);
  const releasedMap = await releasedClueIdsByCard(session.id);
  const releasedClueIdsByCardRecord: Record<string, string[]> = {};
  for (const [cardId, set] of releasedMap.entries()) releasedClueIdsByCardRecord[cardId] = [...set];

  const events = await prisma.sessionEvent.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { participant: true },
  });
  const cardById = new Map(content.cards.map((c) => [c.id, c]));
  const timeline: TimelineEventDTO[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    participantName: e.participant?.name ?? null,
    cardTitle: e.cardId ? cardById.get(e.cardId)?.title ?? null : null,
    createdAt: e.createdAt.toISOString(),
    payload: (e.payload as Record<string, unknown> | null) ?? null,
  }));

  return {
    ...publicState,
    hostToken: session.hostToken,
    participantsDetailed,
    distributionAlways,
    timeline,
    releasedClueIdsByCard: releasedClueIdsByCardRecord,
  };
}

async function currentRoundAnswerCountByParticipant(session: Session, content: GameContent) {
  const map = new Map<string, number>();
  if (session.currentRound === 1 || session.currentRound === 2) {
    const placements = await prisma.placement.findMany({
      where: { sessionId: session.id, round: session.currentRound },
    });
    const seen = new Map<string, Set<string>>();
    for (const p of placements) {
      const set = seen.get(p.participantId) ?? new Set<string>();
      set.add(p.cardId);
      seen.set(p.participantId, set);
    }
    for (const [participantId, set] of seen.entries()) map.set(participantId, set.size);
  } else if (session.currentRound === 3) {
    const rows = await prisma.evidenceAssociation.findMany({ where: { sessionId: session.id } });
    const seen = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = seen.get(r.participantId) ?? new Set<string>();
      set.add(r.cardId);
      seen.set(r.participantId, set);
    }
    for (const [participantId, set] of seen.entries()) map.set(participantId, set.size);
  } else if (session.currentRound === 4) {
    const rows = await prisma.scenarioResponse.findMany({ where: { sessionId: session.id } });
    const seen = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = seen.get(r.participantId) ?? new Set<string>();
      set.add(r.scenarioItemId);
      seen.set(r.participantId, set);
    }
    for (const [participantId, set] of seen.entries()) map.set(participantId, set.size);
  }
  return map;
}

export async function markParticipantConnection(
  code: string,
  token: string,
  connected: boolean,
) {
  const session = await requireSession(code);
  await prisma.participant.updateMany({
    where: { sessionId: session.id, token },
    data: { connected, lastSeenAt: new Date() },
  });
}
