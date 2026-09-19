"use client";

import clsx from "clsx";
import type { CardDistributionDTO, CardDTO, ZoneDTO } from "@/types/realtime";

export function DistributionPanel({
  distribution,
  cards,
  zones,
  onlyDivergent,
}: {
  distribution: CardDistributionDTO[];
  cards: CardDTO[];
  zones: ZoneDTO[];
  onlyDivergent?: boolean;
}) {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const rows = distribution
    .filter((d) => d.totalAnswers > 0)
    .filter((d) => !onlyDivergent || d.divergent)
    .sort((a, b) => (a.divergent === b.divergent ? 0 : a.divergent ? -1 : 1));

  if (rows.length === 0) {
    return <p className="text-xs text-paper-300/50">Ainda não há respostas suficientes para exibir.</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const card = cardById.get(row.cardId);
        if (!card) return null;
        return (
          <div key={row.cardId} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-paper-50">{card.title}</p>
              {row.divergent && (
                <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-500">
                  ⚠ divergente
                </span>
              )}
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-navy-950">
              {zones.map((zone) => {
                const count = row.byZone[zone.id] ?? 0;
                const pct = row.totalAnswers === 0 ? 0 : (count / row.totalAnswers) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={zone.id}
                    style={{ width: `${pct}%` }}
                    className={clsx(
                      zone.isFallback ? "bg-navy-500" : "bg-gold-500",
                      "first:rounded-l-full last:rounded-r-full",
                    )}
                    title={`${zone.name}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {Object.entries(row.byZone).map(([zoneId, count]) => (
                <span key={zoneId} className="text-[11px] text-paper-300/60">
                  {zoneById.get(zoneId)?.name ?? zoneId}: {Math.round((count / row.totalAnswers) * 100)}%
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
