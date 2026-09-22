// Smoke test de ponta a ponta: professor cria sala, 2 participantes jogam as 4 rodadas,
// verifica sincronização em tempo real, revelação e relatórios finais.
//
// Requer: `npm run dev` (ou `npm start`) já rodando em outro terminal, banco migrado e
// populado (`npm run prisma:migrate && npm run prisma:seed`), e Playwright instalado
// (`npm install -D playwright && npx playwright install chromium` se ainda não tiver
// os browsers). Uso: node scripts/e2e-smoke.cjs
const { chromium } = require("playwright");

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CARD_KEYS = [
  "CMN", "BCB", "CVM", "SUSEP", "PREVIC", "FGC",
  "BANCO", "SCFI", "SCD", "SEP", "IP", "CORRETORA", "SEGURADORA",
  "FINTECH", "MARCA", "PRESTADOR_TECH", "AURORA",
];

function log(step) {
  console.log(`\n=== ${step} ===`);
}

async function placeAllCards(page, zoneName) {
  for (const key of CARD_KEYS) {
    await page.getByTestId(`card-${key}`).click();
    const picker = page.getByTestId("zone-picker");
    await picker.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/actions") && r.request().method() === "POST"),
      picker.getByRole("button", { name: zoneName, exact: true }).click(),
    ]);
    await picker.waitFor({ state: "hidden" });
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: true,
  });

  const profCtx = await browser.newContext();
  const p1Ctx = await browser.newContext();
  const p2Ctx = await browser.newContext();
  const viewerCtx = await browser.newContext();

  const prof = await profCtx.newPage();
  const p1 = await p1Ctx.newPage();
  const p2 = await p2Ctx.newPage();
  const viewer = await viewerCtx.newPage();

  prof.on("pageerror", (e) => console.error("PROF PAGE ERROR:", e));
  p1.on("pageerror", (e) => console.error("P1 PAGE ERROR:", e));
  p2.on("pageerror", (e) => console.error("P2 PAGE ERROR:", e));

  try {
    log("Professor cria sala");
    await prof.goto(`${BASE_URL}/professor/novo`);
    await prof.getByRole("button", { name: "Criar sala" }).click();
    await prof.waitForURL(/\/professor\/[A-Z0-9]+$/, { timeout: 15000 });
    const code = prof.url().split("/").pop();
    console.log("Código da sala:", code);
    if (!code) throw new Error("Código da sala não encontrado na URL.");

    log("Participantes entram na sala");
    await p1.goto(`${BASE_URL}/sala/${code}?name=Gustavo`);
    await p2.goto(`${BASE_URL}/sala/${code}?name=Renata`);
    await p1.waitForSelector("text=Aguardando o início da investigação");
    await p2.waitForSelector("text=Aguardando o início da investigação");

    log("Telão conecta");
    await viewer.goto(`${BASE_URL}/sala/${code}/telao`);
    await viewer.waitForSelector(`text=${code}`);

    await prof.waitForSelector("text=/2 investigadores conectados/");

    log("Professor inicia briefing e Rodada 1");
    await prof.getByRole("button", { name: "Iniciar briefing" }).click();
    await p1.waitForSelector("text=Briefing da missão");
    await prof.getByRole("button", { name: "Iniciar Rodada 1" }).click();
    await p1.waitForSelector("text=Cartas embaralhadas");
    await p2.waitForSelector("text=Cartas embaralhadas");

    log("Rodada 1: participantes posicionam todas as cartas");
    await placeAllCards(p1, "Opera");
    await placeAllCards(p2, "Supervisiona");
    await p1.waitForSelector("text=Cartas embaralhadas", { state: "hidden" });
    await p2.waitForSelector("text=Cartas embaralhadas", { state: "hidden" });

    log("Professor congela, mostra distribuição e avança para Rodada 2");
    await prof.getByRole("button", { name: "Congelar respostas" }).click();
    await prof.getByRole("button", { name: "Mostrar distribuição" }).click();
    await prof.waitForSelector("text=/⚠ divergente|Ainda não há respostas/");
    await prof.getByRole("button", { name: "Continuar" }).click();
    await prof.getByRole("button", { name: "Congelar respostas" }).click();
    await prof.getByRole("button", { name: "Revelar solução" }).click();
    await prof.getByRole("button", { name: "Avançar rodada" }).click();
    await p1.waitForSelector("text=Rodada 2");

    log("Professor libera uma pista da Rodada 2");
    await prof.getByRole("button", { name: /Liberar próxima pista/ }).click();
    await p1.waitForSelector("text=Nova evidência recebida");

    log("Professor congela e revela Rodada 2 (classificação)");
    await prof.getByRole("button", { name: "Congelar respostas" }).click();
    await prof.getByRole("button", { name: "Revelar solução" }).click();
    await p1.waitForSelector("text=/✓ Confirmado|Revisar/");
    await prof.getByRole("button", { name: "Avançar rodada" }).click();
    await p1.waitForSelector("text=Rodada 3");

    log("Rodada 3: participantes associam evidências");
    await p1.getByRole("button", { name: "CMN", exact: true }).click();
    await p1.getByText("Resolução do CMN", { exact: true }).click();
    await p2.getByRole("button", { name: "PicPay", exact: true }).click();
    await p2.getByText("Consulta oficial do BCB", { exact: true }).click();

    log("Professor congela e revela Rodada 3");
    await prof.getByRole("button", { name: "Congelar respostas" }).click();
    await prof.getByRole("button", { name: "Revelar solução" }).click();
    await prof.getByRole("button", { name: "Avançar rodada" }).click();
    await p1.waitForSelector("text=Rodada 4");

    log("Rodada 4: participantes preenchem o dossiê Aurora");
    await p1.getByLabel("Responsável provável").first().selectOption("Aurora Pagamentos S.A.");
    await p1.getByLabel("Tipo de instituição").first().selectOption("Instituição de Pagamento");
    await p2.locator("text=Não existem informações suficientes para concluir").first().click();

    log("Professor congela, revela e finaliza a atividade");
    await prof.getByRole("button", { name: "Congelar respostas" }).click();
    await prof.getByRole("button", { name: "Revelar solução" }).click();
    await prof.getByRole("button", { name: "Finalizar atividade" }).click();

    await p1.waitForSelector("text=Relatório do Investigador", { timeout: 15000 });
    await p2.waitForSelector("text=Relatório do Investigador", { timeout: 15000 });
    await prof.waitForSelector("text=Relatório da turma", { timeout: 15000 });
    await viewer.waitForSelector("text=O mapa do SFN foi reconstruído.", { timeout: 15000 });

    console.log("\n✅ SMOKE TEST PASSOU DE PONTA A PONTA");
  } catch (err) {
    console.error("\n❌ SMOKE TEST FALHOU:", err);
    await prof.screenshot({ path: "/tmp/e2e-fail-prof.png", fullPage: true }).catch(() => {});
    await p1.screenshot({ path: "/tmp/e2e-fail-p1.png", fullPage: true }).catch(() => {});
    await p2.screenshot({ path: "/tmp/e2e-fail-p2.png", fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
