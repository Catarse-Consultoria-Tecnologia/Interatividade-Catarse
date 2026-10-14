// Verifica RNF-004/005: atualizar a página não apaga progresso; reconexão é automática.
// Uso: node scripts/e2e-reconnect.cjs (com `npm run dev` já rodando)
const { chromium } = require("playwright");
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: true,
  });
  const profCtx = await browser.newContext();
  const p1Ctx = await browser.newContext();
  const prof = await profCtx.newPage();
  const p1 = await p1Ctx.newPage();

  try {
    await prof.goto(`${BASE_URL}/professor/novo`);
    // A lista de jogos publicados tem mais de um jogo — escolhe o card da Operação SFN.
    await prof
      .locator(".dossier-card", { hasText: "Operação SFN" })
      .getByRole("button", { name: "Criar sala" })
      .click();
    await prof.waitForURL(/\/professor\/[A-Z0-9]+$/);
    const code = prof.url().split("/").pop();
    console.log("code:", code);

    await p1.goto(`${BASE_URL}/sala/${code}?name=Jefferson`);
    await p1.waitForSelector("text=Aguardando o início da investigação");

    await prof.getByRole("button", { name: "Iniciar briefing" }).click();
    await prof.getByRole("button", { name: "Iniciar Rodada 1" }).click();
    await p1.waitForSelector("text=Cartas embaralhadas");

    await p1.getByTestId("card-CMN").click();
    await p1.getByTestId("zone-picker").getByRole("button", { name: "Normatiza", exact: true }).click();
    await p1.waitForSelector("text=Hipótese registrada");

    console.log("Recarregando a página do participante...");
    await p1.reload();
    await p1.waitForSelector("text=Cartas embaralhadas", { timeout: 15000 });
    const stillThere = await p1.getByTestId("card-CMN").getByText("Hipótese registrada").count();
    if (stillThere === 0) throw new Error("Placement da carta CMN não sobreviveu ao reload!");
    console.log("✅ Reconexão preservou o progresso (RNF-004/005 ok).");
  } catch (err) {
    console.error("❌ FALHOU:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
