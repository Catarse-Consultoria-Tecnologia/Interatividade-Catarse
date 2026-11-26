import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Conteúdo da Operação Gênesis: carregado do mesmo jeito que o motor de
// cartas/zonas (ver src/lib/game-engine/content.ts), mas com o shape próprio
// de etapas/questões/opções — jogo autoguiado, sem rodadas em lockstep.
export const GENESIS_GAME_SLUG = "operacao-genesis";

const genesisContentInclude = {
  genesisStages: {
    orderBy: { order: "asc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { orderBy: { order: "asc" } },
        },
      },
    },
  },
} satisfies Prisma.GameInclude;

export type GenesisContent = Prisma.GameGetPayload<{ include: typeof genesisContentInclude }>;

const cache = new Map<string, GenesisContent>();

export async function loadGenesisContentById(gameId: string): Promise<GenesisContent> {
  const cached = cache.get(gameId);
  if (cached) return cached;

  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: genesisContentInclude,
  });
  cache.set(game.id, game);
  return game;
}

export async function loadGenesisContentBySlug(slug: string = GENESIS_GAME_SLUG): Promise<GenesisContent> {
  const game = await prisma.game.findUniqueOrThrow({
    where: { slug },
    include: genesisContentInclude,
  });
  cache.set(game.id, game);
  return game;
}

export function invalidateGenesisContentCache(gameId?: string) {
  if (gameId) cache.delete(gameId);
  else cache.clear();
}
