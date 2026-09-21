import { PrismaClient } from "@prisma/client";
import { seedOperacaoSFN } from "./seed-operacao-sfn";

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
