import { prisma } from "@/lib/prisma";
import {
  GameServiceError,
  authenticateProfessor,
  joinParticipant,
} from "@/lib/game-engine/session-service";
import { loadGenesisContentById, type GenesisContent } from "./content";
import type { Session } from "@prisma/client";

export { GameServiceError, joinParticipant, authenticateProfessor };

// Abaixo de quantas respostas uma questão não entra no radar de "pontos de
// atenção" do professor — amostra pequena demais para significar algo.
const ATTENTION_MIN_ANSWERS = 3;
// Acima de qual taxa de erro uma questão é sinalizada como ponto de atenção.
const ATTENTION_WRONG_RATE = 0.5;

export type GenesisProfessorActionType =
  | "START"
  | "LOCK_LOBBY"
  | "UNLOCK_LOBBY"
  | "REMOVE_PARTICIPANT"
  | "RENAME_PARTICIPANT"
  | "CLOSE";

async function requireSession(code: string): Promise<Session> {
  const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) throw new GameServiceError("Sala não encontrada.", "NOT_FOUND");
  return session;
}

async function requireParticipant(sessionId: string, token: string) {
  const participant = await prisma.participant.findFirst({
    where: { sessionId, token, removed: false },
  });
  if (!participant) throw new GameServiceError("Participante não encontrado nesta sala.", "FORBIDDEN");
  return participant;
}

/** Quantas questões de cada etapa um participante já respondeu, nesta sessão. */
async function answeredCountByStage(sessionId: string, participantId: string): Promise<Map<string, number>> {
  const answers = await prisma.genesisAnswer.findMany({
    where: { sessionId, participantId },
    include: { question: { select: { stageId: true } } },
  });
  const counts = new Map<string, number>();
  for (const answer of answers) {
    const stageId = answer.question.stageId;
    counts.set(stageId, (counts.get(stageId) ?? 0) + 1);
  }
  return counts;
}

export interface GenesisQuestionDTO {
  id: string;
  order: number;
  prompt: string;
  options: { id: string; order: number; text: string }[];
  answer: { optionId: string; isCorrect: boolean; correctOptionId: string; explanation: string } | null;
}

export interface GenesisStageDTO {
  id: string;
  key: string;
  order: number;
  title: string;
  narrative: string;
  scriptLabel: string | null;
  script: string | null;
  locked: boolean;
  completed: boolean;
  answeredCount: number;
  totalQuestions: number;
  questions: GenesisQuestionDTO[];
}

export interface GenesisStudentStateDTO {
  code: string;
  sessionStatus: Session["status"];
  participantId: string;
  participantName: string;
  gameName: string;
  gameDescription: string;
  stages: GenesisStageDTO[];
}

function buildStageDTOs(
  content: GenesisContent,
  answeredByStage: Map<string, number>,
  answersByQuestion: Map<string, { optionId: string; isCorrect: boolean }>,
): GenesisStageDTO[] {
  let previousCompleted = true;
  return content.genesisStages.map((stage) => {
    const answeredCount = answeredByStage.get(stage.id) ?? 0;
    const completed = answeredCount >= stage.questions.length;
    const locked = !previousCompleted;
    previousCompleted = completed;

    return {
      id: stage.id,
      key: stage.key,
      order: stage.order,
      title: stage.title,
      narrative: stage.narrative,
      scriptLabel: stage.scriptLabel,
      script: stage.script,
      locked,
      completed,
      answeredCount,
      totalQuestions: stage.questions.length,
      questions: stage.questions.map((question) => {
        const given = answersByQuestion.get(question.id);
        const correctOption = question.options.find((o) => o.isCorrect);
        return {
          id: question.id,
          order: question.order,
          prompt: question.prompt,
          options: question.options.map((o) => ({ id: o.id, order: o.order, text: o.text })),
          answer: given
            ? {
                optionId: given.optionId,
                isCorrect: given.isCorrect,
                correctOptionId: correctOption?.id ?? given.optionId,
                explanation: question.explanation,
              }
            : null,
        };
      }),
    };
  });
}

export async function buildGenesisStudentState(code: string, token: string): Promise<GenesisStudentStateDTO> {
  const session = await requireSession(code);
  const participant = await prisma.participant.findFirst({
    where: { sessionId: session.id, token, removed: false },
  });
  if (!participant) throw new GameServiceError("Participante não encontrado nesta sala.", "FORBIDDEN");

  const content = await loadGenesisContentById(session.gameId);
  const answeredByStage = await answeredCountByStage(session.id, participant.id);

  const rawAnswers = await prisma.genesisAnswer.findMany({
    where: { sessionId: session.id, participantId: participant.id },
  });
  const answersByQuestion = new Map(
    rawAnswers.map((a) => [a.questionId, { optionId: a.optionId, isCorrect: a.isCorrect }]),
  );

  return {
    code: session.code,
    sessionStatus: session.status,
    participantId: participant.id,
    participantName: participant.name,
    gameName: content.name,
    gameDescription: content.description,
    stages: buildStageDTOs(content, answeredByStage, answersByQuestion),
  };
}

export interface GenesisAnswerResultDTO {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
  stageCompleted: boolean;
}

export async function submitGenesisAnswer(
  code: string,
  token: string,
  questionId: string,
  optionId: string,
): Promise<GenesisAnswerResultDTO> {
  const session = await requireSession(code);
  if (session.status !== "ACTIVE") {
    throw new GameServiceError("Esta sala não está com a investigação em andamento.", "INVALID_STATE");
  }
  const participant = await requireParticipant(session.id, token);

  const content = await loadGenesisContentById(session.gameId);
  const stage = content.genesisStages.find((s) => s.questions.some((q) => q.id === questionId));
  const question = stage?.questions.find((q) => q.id === questionId);
  const option = question?.options.find((o) => o.id === optionId);
  if (!stage || !question || !option) {
    throw new GameServiceError("Questão ou opção inválida.", "BAD_REQUEST");
  }

  const answeredByStage = await answeredCountByStage(session.id, participant.id);
  const stageIndex = content.genesisStages.findIndex((s) => s.id === stage.id);
  const previousStage = stageIndex > 0 ? content.genesisStages[stageIndex - 1] : null;
  if (previousStage) {
    const previousAnswered = answeredByStage.get(previousStage.id) ?? 0;
    if (previousAnswered < previousStage.questions.length) {
      throw new GameServiceError(
        "Complete as questões da etapa anterior antes de avançar para esta.",
        "INVALID_STATE",
      );
    }
  }

  const existing = await prisma.genesisAnswer.findUnique({
    where: { sessionId_participantId_questionId: { sessionId: session.id, participantId: participant.id, questionId } },
  });
  const correctOption = question.options.find((o) => o.isCorrect);
  const correctOptionId = correctOption?.id ?? option.id;

  if (existing) {
    return {
      isCorrect: existing.isCorrect,
      correctOptionId,
      explanation: question.explanation,
      stageCompleted: (answeredByStage.get(stage.id) ?? 0) >= stage.questions.length,
    };
  }

  const isCorrect = option.isCorrect;
  await prisma.genesisAnswer.create({
    data: { sessionId: session.id, participantId: participant.id, questionId, optionId, isCorrect },
  });
  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      type: "GENESIS_ANSWER_SUBMITTED",
      participantId: participant.id,
      payload: { stageKey: stage.key, questionOrder: question.order, isCorrect },
    },
  });

  const newAnsweredCount = (answeredByStage.get(stage.id) ?? 0) + 1;
  const stageCompleted = newAnsweredCount >= stage.questions.length;
  if (stageCompleted) {
    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        type: "GENESIS_STAGE_COMPLETED",
        participantId: participant.id,
        payload: { stageKey: stage.key },
      },
    });
  }

  return { isCorrect, correctOptionId, explanation: question.explanation, stageCompleted };
}

// ---------------------------------------------------------------------------
// Painel do professor
// ---------------------------------------------------------------------------

export interface GenesisParticipantRowDTO {
  id: string;
  name: string;
  connected: boolean;
  stages: { stageKey: string; stageTitle: string; percentCorrect: number | null; completed: boolean }[];
}

export interface GenesisAttentionPointDTO {
  stageTitle: string;
  questionOrder: number;
  prompt: string;
  totalAnswered: number;
  wrongRate: number;
}

export interface GenesisProfessorStateDTO {
  code: string;
  hostToken: string;
  sessionStatus: Session["status"];
  lobbyLocked: boolean;
  gameName: string;
  gameDescription: string;
  participants: GenesisParticipantRowDTO[];
  attentionPoints: GenesisAttentionPointDTO[];
}

export async function buildGenesisProfessorState(code: string, hostToken: string): Promise<GenesisProfessorStateDTO> {
  const session = await authenticateProfessor(code, hostToken);
  const content = await loadGenesisContentById(session.gameId);

  const participants = await prisma.participant.findMany({
    where: { sessionId: session.id, removed: false },
    orderBy: { joinedAt: "asc" },
  });

  const allAnswers = await prisma.genesisAnswer.findMany({
    where: { sessionId: session.id },
    include: { question: { select: { id: true, stageId: true, order: true, prompt: true } } },
  });

  const answersByParticipant = new Map<string, typeof allAnswers>();
  for (const answer of allAnswers) {
    const list = answersByParticipant.get(answer.participantId) ?? [];
    list.push(answer);
    answersByParticipant.set(answer.participantId, list);
  }

  const participantRows: GenesisParticipantRowDTO[] = participants.map((participant) => {
    const answers = answersByParticipant.get(participant.id) ?? [];
    const byStage = new Map<string, { correct: number; total: number }>();
    for (const answer of answers) {
      const stats = byStage.get(answer.question.stageId) ?? { correct: 0, total: 0 };
      stats.total += 1;
      if (answer.isCorrect) stats.correct += 1;
      byStage.set(answer.question.stageId, stats);
    }
    return {
      id: participant.id,
      name: participant.name,
      connected: participant.connected,
      stages: content.genesisStages.map((stage) => {
        const stats = byStage.get(stage.id);
        return {
          stageKey: stage.key,
          stageTitle: stage.title,
          percentCorrect: stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null,
          completed: (stats?.total ?? 0) >= stage.questions.length,
        };
      }),
    };
  });

  const byQuestion = new Map<string, { correct: number; total: number }>();
  for (const answer of allAnswers) {
    const stats = byQuestion.get(answer.questionId) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (answer.isCorrect) stats.correct += 1;
    byQuestion.set(answer.questionId, stats);
  }

  const attentionPoints: GenesisAttentionPointDTO[] = [];
  for (const stage of content.genesisStages) {
    for (const question of stage.questions) {
      const stats = byQuestion.get(question.id);
      if (!stats || stats.total < ATTENTION_MIN_ANSWERS) continue;
      const wrongRate = 1 - stats.correct / stats.total;
      if (wrongRate > ATTENTION_WRONG_RATE) {
        attentionPoints.push({
          stageTitle: stage.title,
          questionOrder: question.order,
          prompt: question.prompt,
          totalAnswered: stats.total,
          wrongRate,
        });
      }
    }
  }
  attentionPoints.sort((a, b) => b.wrongRate - a.wrongRate);

  return {
    code: session.code,
    hostToken: session.hostToken,
    sessionStatus: session.status,
    lobbyLocked: session.lobbyLocked,
    gameName: content.name,
    gameDescription: content.description,
    participants: participantRows,
    attentionPoints,
  };
}

const nameSchema = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) throw new GameServiceError("Informe um nome.", "BAD_REQUEST");
  if (trimmed.length > 40) throw new GameServiceError("Nome muito longo.", "BAD_REQUEST");
  return trimmed;
};

export async function runGenesisProfessorAction(
  code: string,
  hostToken: string,
  action: GenesisProfessorActionType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const session = await authenticateProfessor(code, hostToken);

  switch (action) {
    case "START": {
      if (session.status !== "LOBBY") {
        throw new GameServiceError("A investigação só pode ser iniciada a partir da sala de espera.", "INVALID_STATE");
      }
      await prisma.session.update({ where: { id: session.id }, data: { status: "ACTIVE" } });
      break;
    }
    case "LOCK_LOBBY":
      await prisma.session.update({ where: { id: session.id }, data: { lobbyLocked: true } });
      break;
    case "UNLOCK_LOBBY":
      await prisma.session.update({ where: { id: session.id }, data: { lobbyLocked: false } });
      break;
    case "REMOVE_PARTICIPANT": {
      const participantId = typeof payload.participantId === "string" ? payload.participantId : undefined;
      if (!participantId) throw new GameServiceError("participantId é obrigatório.", "BAD_REQUEST");
      await prisma.participant.update({ where: { id: participantId }, data: { removed: true } });
      await prisma.sessionEvent.create({
        data: { sessionId: session.id, type: "PARTICIPANT_REMOVED", participantId },
      });
      break;
    }
    case "RENAME_PARTICIPANT": {
      const participantId = typeof payload.participantId === "string" ? payload.participantId : undefined;
      const newName = typeof payload.name === "string" ? nameSchema(payload.name) : undefined;
      if (!participantId || !newName) {
        throw new GameServiceError("participantId e name são obrigatórios.", "BAD_REQUEST");
      }
      await prisma.participant.update({ where: { id: participantId }, data: { name: newName } });
      await prisma.sessionEvent.create({
        data: { sessionId: session.id, type: "PARTICIPANT_RENAMED", participantId, payload: { name: newName } },
      });
      break;
    }
    case "CLOSE": {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await prisma.sessionEvent.create({ data: { sessionId: session.id, type: "SESSION_CLOSED" } });
      break;
    }
    default:
      throw new GameServiceError(`Ação desconhecida: ${action}`, "BAD_REQUEST");
  }
}
