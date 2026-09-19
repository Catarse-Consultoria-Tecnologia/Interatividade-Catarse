import type { IndividualReportDTO } from "@/types/realtime";

export function IndividualReport({ report, name }: { report: IndividualReportDTO; name: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="dossier-card p-6 text-center">
        <p className="label-eyebrow">Caso encerrado</p>
        <h1 className="font-display text-2xl font-black text-ink-900">Relatório do Investigador</h1>
        <p className="mt-1 text-sm text-ink-700">{name}, aqui está o que você descobriu.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Hipóteses analisadas" value={report.hypothesesAnalyzed} />
        <Stat label="Hipóteses revistas" value={report.hypothesesRevised} />
        <Stat label="Evidências corretas" value={report.evidencesCorrect} />
        <Stat label="Insuficiências corretas" value={report.insufficientCorrect} />
      </div>

      <div className="dossier-card p-5">
        <p className="label-eyebrow mb-1">Leitura institucional</p>
        <div className="flex items-end gap-2">
          <span className="font-display text-3xl font-black text-navy-800">
            {report.institutionalReadingPercent}%
          </span>
          <span className="pb-1 text-xs text-ink-700/70">
            das cartas do baralho principal classificadas ou reconhecidas como insuficientes
            corretamente
          </span>
        </div>
        <div className="mt-3 flex items-end gap-2 border-t border-ink-900/10 pt-3">
          <span className="font-display text-2xl font-black text-gold-600">{report.totalScore}</span>
          <span className="pb-0.5 text-xs text-ink-700/70">pontos — pontuação não premia velocidade</span>
        </div>
      </div>

      {report.revisionHighlights.length > 0 && (
        <div className="dossier-card p-5">
          <p className="label-eyebrow mb-2">Boa revisão de hipótese</p>
          <ul className="space-y-1.5">
            {report.revisionHighlights.map((h, i) => (
              <li key={i} className="text-sm text-ink-700">
                Você classificou <strong>{h.cardTitle}</strong> como <em>{h.from}</em> e, após nova
                evidência, mudou para <em>{h.to}</em>.
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.badges.length > 0 && (
        <div className="dossier-card p-5">
          <p className="label-eyebrow mb-2">Distintivos</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {report.badges.map((b) => (
              <div key={b.key} className="rounded-lg border border-gold-500/30 bg-gold-500/10 p-3">
                <p className="text-sm font-bold text-ink-900">🏅 {b.title}</p>
                <p className="mt-0.5 text-xs text-ink-700">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dossier-card space-y-2 p-5 text-center">
        <p className="font-display text-lg font-bold text-ink-900">
          Você não precisa decorar todas as siglas.
        </p>
        <p className="text-sm text-ink-700">Precisa aprender a fazer as perguntas corretas.</p>
        <div className="mx-auto mt-2 max-w-sm space-y-1 text-left text-xs text-ink-700/80">
          <p>Quem faz?</p>
          <p>Quem autoriza ou regula?</p>
          <p>Quem supervisiona?</p>
          <p>Qual evidência comprova?</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="dossier-card p-3 text-center">
      <p className="font-display text-2xl font-black text-navy-800">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-ink-700/70">{label}</p>
    </div>
  );
}
