"use client";

import { useState } from "react";
import clsx from "clsx";
import type { ZoneDTO } from "@/types/realtime";

export function ZonePanel({
  zone,
  count,
  onDropCard,
  children,
}: {
  zone: ZoneDTO;
  count: number;
  onDropCard: (cardId: string) => void;
  children: React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const cardId = e.dataTransfer.getData("text/card-id");
        if (cardId) onDropCard(cardId);
      }}
      className={clsx(
        "cork-panel flex min-h-[220px] flex-col gap-2.5 p-3.5 transition",
        dragOver && "ring-2 ring-gold-500/60",
        zone.isFallback && "border-dashed",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-paper-50">{zone.name}</h2>
          <p className="label-eyebrow mt-0.5 font-normal normal-case tracking-normal text-paper-300/70">
            {zone.subtitle}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs font-semibold text-paper-50">
          {count}
        </span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto">{children}</div>
    </section>
  );
}
