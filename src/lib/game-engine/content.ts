import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const gameContentInclude = {
  zones: { orderBy: { order: "asc" } },
  cards: {
    orderBy: { order: "asc" },
    include: {
      answer: true,
      clues: { orderBy: { order: "asc" } },
    },
  },
  evidences: true,
  scenarios: {
    orderBy: { order: "asc" },
    include: {
      documents: { orderBy: { order: "asc" } },
      items: { orderBy: { order: "asc" } },
    },
  },
  pollQuestions: { orderBy: [{ round: "asc" }, { order: "asc" }] },
} satisfies Prisma.GameInclude;

export type GameContent = Prisma.GameGetPayload<{ include: typeof gameContentInclude }>;

const cache = new Map<string, GameContent>();

export async function loadGameContentById(gameId: string): Promise<GameContent> {
  const cached = cache.get(gameId);
  if (cached) return cached;

  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: gameContentInclude,
  });
  cache.set(gameId, game);
  return game;
}

export async function loadGameContentBySlug(slug: string): Promise<GameContent> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { slug },
    include: gameContentInclude,
  });
  cache.set(game.id, game);
  return game;
}

export function invalidateGameContentCache(gameId?: string) {
  if (gameId) cache.delete(gameId);
  else cache.clear();
}

/** Alguns jogos (ex.: os baseados só em rodadas POLL) ainda não têm nenhum Scenario cadastrado. */
export function primaryScenario(content: GameContent) {
  return content.scenarios[0];
}

/** Mecânica da rodada N (1-based) deste jogo, ou undefined fora do intervalo de rounds cadastrado. */
export function roundKindAt(content: GameContent, round: number) {
  return content.roundKinds[round - 1];
}
