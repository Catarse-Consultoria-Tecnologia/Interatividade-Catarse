import type { IndividualReportDTO } from "@/types/realtime";

const NAVY = "#0a1526";
const GOLD = "#c99a24";
const INK = "#1a1508";
const INK_MUTED = "#6b5f42";

/**
 * Gera e dispara o download do relatório individual em PDF. Importa o jsPDF dinamicamente
 * porque é uma lib client-only (usa Canvas/Blob) — não deve entrar no bundle do servidor.
 */
export async function downloadIndividualReportPdf(
  report: IndividualReportDTO,
  participantName: string,
  gameName: string,
  roomCode: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 0;

  // Cabeçalho
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CATARSE · OPERAÇÃO SFN — QUEM FAZ O QUÊ?", marginX, 36);
  doc.setTextColor("#ffffff");
  doc.setFontSize(20);
  doc.text("Relatório do Investigador", marginX, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#d7ddea");
  doc.text(`${participantName} · sala ${roomCode}`, marginX, 82);

  y = 130;

  // Estatísticas
  const stats: [string, number][] = [
    ["Hipóteses analisadas", report.hypothesesAnalyzed],
    ["Hipóteses revistas", report.hypothesesRevised],
    ["Evidências corretas", report.evidencesCorrect],
    ["Insuficiências corretas", report.insufficientCorrect],
  ];
  const statBoxWidth = (pageWidth - marginX * 2 - 3 * 10) / 4;
  stats.forEach(([label, value], i) => {
    const x = marginX + i * (statBoxWidth + 10);
    doc.setDrawColor("#e2d5b6");
    doc.setLineWidth(1);
    doc.roundedRect(x, y, statBoxWidth, 58, 4, 4, "S");
    doc.setTextColor(NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(String(value), x + statBoxWidth / 2, y + 28, { align: "center" });
    doc.setTextColor(INK_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(label, statBoxWidth - 8);
    doc.text(lines, x + statBoxWidth / 2, y + 42, { align: "center" });
  });
  y += 58 + 24;

  // Leitura institucional + pontuação
  doc.setDrawColor("#e2d5b6");
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 64, 4, 4, "S");
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${report.institutionalReadingPercent}%`, marginX + 16, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK_MUTED);
  doc.text(
    doc.splitTextToSize("das cartas do baralho principal classificadas ou\nreconhecidas como insuficientes corretamente", 200),
    marginX + 16,
    y + 44,
  );
  doc.setTextColor(GOLD as string);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(String(report.totalScore), pageWidth - marginX - 140, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(INK_MUTED);
  doc.text("pontos — a pontuação não premia velocidade", pageWidth - marginX - 140, y + 44);
  y += 64 + 24;

  // Revisões de hipótese
  if (report.revisionHighlights.length > 0) {
    y = sectionTitle(doc, "Boa revisão de hipótese", marginX, y);
    for (const h of report.revisionHighlights) {
      const text = `${h.cardTitle}: de "${h.from}" para "${h.to}", após nova evidência.`;
      const lines = doc.splitTextToSize(text, pageWidth - marginX * 2 - 12);
      doc.setTextColor(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(lines, marginX + 12, y);
      y += lines.length * 13 + 6;
    }
    y += 12;
  }

  // Distintivos
  if (report.badges.length > 0) {
    y = sectionTitle(doc, "Distintivos conquistados", marginX, y);
    for (const b of report.badges) {
      doc.setTextColor(GOLD as string);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`★ ${b.title}`, marginX + 12, y);
      doc.setTextColor(INK_MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(b.description, pageWidth - marginX * 2 - 24);
      doc.text(lines, marginX + 12, y + 12);
      y += 12 + lines.length * 11 + 8;
    }
    y += 8;
  }

  // Rodapé
  if (y > 700) {
    doc.addPage();
    y = 60;
  }
  doc.setDrawColor("#e2d5b6");
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;
  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Você não precisa decorar todas as siglas.", marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(INK_MUTED);
  doc.text("Precisa aprender a fazer as perguntas corretas:", marginX, y);
  y += 16;
  for (const q of ["Quem faz?", "Quem autoriza ou regula?", "Quem supervisiona?", "Qual evidência comprova?"]) {
    doc.text(`•  ${q}`, marginX + 8, y);
    y += 14;
  }

  const fileSafeName = participantName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  doc.save(`relatorio-${fileSafeName || "investigador"}-${roomCode.toLowerCase()}.pdf`);
}

function sectionTitle(doc: import("jspdf").jsPDF, title: string, x: number, y: number): number {
  doc.setTextColor("#c99a24");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), x, y);
  return y + 16;
}
