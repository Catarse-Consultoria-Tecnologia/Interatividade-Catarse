import { PrismaClient } from "@prisma/client";
import { seedOperacaoSFN } from "./seed-operacao-sfn";
import { seedModulo3Processos } from "./seed-modulo3-processos";
import { seedGenesis } from "./seed-genesis";

const prisma = new PrismaClient();

async function main() {
  console.log("Populando Operação SFN — Quem Faz o Quê?...");
  const result = await seedOperacaoSFN(prisma);
  console.log(`Concluído. Jogo "${result.gameName}" (${result.gameId}) pronto com:`);
  console.log(`  - ${result.zones} zonas`);
  console.log(`  - ${result.cards} cartas`);
  console.log(`  - ${result.evidences} evidências`);
  console.log(`  - 1 cenário (${result.scenarioTitle}) com 4 documentos e 6 linhas de matriz`);
  console.log(`  - ${result.badges} distintivos`);

  console.log("\nPopulando Operação Processos — Pessoas, Processos e Eventos...");
  const result2 = await seedModulo3Processos(prisma);
  console.log(`Concluído. Jogo "${result2.gameName}" (${result2.gameId}) pronto com:`);
  console.log(`  - ${result2.pollQuestions} perguntas na rodada de enquete (Rodada 1)`);

  console.log("\nPopulando Operação Gênesis (Módulo 4)...");
  const result3 = await seedGenesis(prisma);
  console.log(`Concluído. Jogo "${result3.gameName}" (${result3.gameId}) pronto com:`);
  console.log(`  - ${result3.stages} etapas`);
  console.log(`  - ${result3.questions} questões`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
