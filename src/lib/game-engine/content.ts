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

export function primaryScenario(content: GameContent) {
  const scenario = content.scenarios[0];
  if (!scenario) throw new Error(`Jogo "${content.slug}" não possui cenário cadastrado.`);
  return scenario;
}
