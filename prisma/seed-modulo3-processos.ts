import type { PrismaClient } from "@prisma/client";

export const GAME_SLUG = "operacao-processos";

export interface SeedResult {
  gameId: string;
  gameName: string;
  pollQuestions: number;
}

/**
 * Popula (ou repopula do zero) "Operação Processos — Pessoas, Processos e Eventos", o jogo
 * do Módulo 3 (Aula 01). Primeira rodada publicada: o aquecimento "pinga-fogo no chat" do
 * slide 4 da aula, modelado como uma rodada POLL (enquete ao vivo SIM/NÃO/DEPENDE, sem
 * gabarito — a distribuição de respostas é o próprio resultado, puxa a discussão em aula).
 * Mais rodadas (Pessoas e papéis, Processo, Eventos, Estado/histórico/log) entram aqui
 * conforme forem pedidas, seguindo o mesmo padrão idempotente do seed da Operação SFN.
 */
export async function seedModulo3Processos(prisma: PrismaClient): Promise<SeedResult> {
  await prisma.session.deleteMany({ where: { game: { slug: GAME_SLUG } } });
  await prisma.game.deleteMany({ where: { slug: GAME_SLUG } });

  const game = await prisma.game.create({
    data: {
      slug: GAME_SLUG,
      name: "Operação Processos — Pessoas, Processos e Eventos",
      description:
        "Dinâmica multiplayer do Módulo 3: como uma operação financeira realmente acontece, " +
        "quem precisa estar na sala, e como se prova o que de fato ocorreu — para além do que a tela mostra.",
      version: "0.1",
      status: "PUBLISHED",
      roundKinds: ["POLL"],
      roundLabels: ["Aquecimento: a operação para?"],
      roundIntros: ["A única pessoa que conhece o fechamento operacional não conseguiu entrar hoje."],
    },
  });

  const questions: { key: string; order: number; prompt: string }[] = [
    { key: "prioridades", order: 1, prompt: "Alguém sabe quais são as prioridades?" },
    { key: "procedimento", order: 2, prompt: "Existe procedimento que outra pessoa consiga reproduzir?" },
    { key: "excecao", order: 3, prompt: "Quem decide uma exceção?" },
    {
      key: "evidencia-encerramento",
      order: 4,
      prompt: "Onde fica a evidência de que o fechamento foi concluído?",
    },
  ];

  await prisma.pollQuestion.createMany({
    data: questions.map((q) => ({
      gameId: game.id,
      round: 1,
      order: q.order,
      key: q.key,
      prompt: q.prompt,
      options: ["SIM", "NÃO", "DEPENDE"],
    })),
  });

  return { gameId: game.id, gameName: game.name, pollQuestions: questions.length };
}
