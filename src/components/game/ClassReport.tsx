import type { ClassReportDTO } from "@/types/realtime";

export function ClassReport({ report }: { report: ClassReportDTO }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Investigadores" value={report.totalParticipants} />
        <Stat label="Pontuação média" value={report.averageScore} />
        <Stat label="% revisão de hipótese" value={`${report.revisionRate}%`} />
        <Stat label="% reconheceu insuficiência" value={`${report.insufficientRecognitionRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-confirm-500/30 bg-confirm-500/5 p-4">
          <p className="label-eyebrow mb-2">Conceitos mais consolidados</p>
          <ul className="space-y-1.5">
            {report.mostConsolidated.map((c) => (
              <li key={c.cardId} className="flex items-center justify-between text-sm text-paper-50">
                <span>{c.cardTitle}</span>
                <span className="font-mono text-confirm-400">{c.correctPercent}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-4">
          <p className="label-eyebrow mb-2">Conceitos com maior divergência</p>
          <ul className="space-y-1.5">
            {report.mostDivergent.map((c) => (
              <li key={c.cardId} className="flex items-center justify-between text-sm text-paper-50">
                <span>{c.cardTitle}</span>
                <span className="font-mono text-gold-500">{c.correctPercent}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="font-display text-2xl font-black text-paper-50">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-paper-300/60">{label}</p>
    </div>
  );
}
