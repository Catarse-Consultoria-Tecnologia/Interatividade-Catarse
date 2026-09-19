"use client";

import { CardTile } from "./CardTile";
import { ZonePanel } from "./ZonePanel";
import type { CardDTO, MyCardStateDTO, ZoneDTO } from "@/types/realtime";

export function Board({
  cards,
  zones,
  placements,
  revealedZoneByCard,
  onPlace,
  disabled,
}: {
  cards: CardDTO[];
  zones: ZoneDTO[];
  placements: MyCardStateDTO[];
  revealedZoneByCard: Record<string, string> | null;
  onPlace: (cardId: string, zoneId: string) => void;
  disabled?: boolean;
}) {
  const placementByCard = new Map(placements.map((p) => [p.cardId, p]));
  const unplaced = cards.filter((c) => !placementByCard.has(c.id));

  return (
    <div className="space-y-5">
      {unplaced.length > 0 && (
        <div className="cork-panel p-3.5">
          <p className="label-eyebrow mb-2.5">
            Cartas embaralhadas ({unplaced.length} restantes)
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {unplaced.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                zones={zones}
                currentZoneId={null}
                isRevision={false}
                revealedZoneId={revealedZoneByCard?.[card.id] ?? null}
                onPlace={(zoneId) => onPlace(card.id, zoneId)}
                disabled={disabled}
                compact
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {zones.map((zone) => {
          const cardsInZone = cards.filter((c) => placementByCard.get(c.id)?.zoneId === zone.id);
          return (
            <ZonePanel
              key={zone.id}
              zone={zone}
              count={cardsInZone.length}
              onDropCard={(cardId) => onPlace(cardId, zone.id)}
            >
              {cardsInZone.map((card) => {
                const placement = placementByCard.get(card.id);
                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    zones={zones}
                    currentZoneId={placement?.zoneId ?? null}
                    isRevision={placement?.isRevision ?? false}
                    revealedZoneId={revealedZoneByCard?.[card.id] ?? null}
                    onPlace={(zoneId) => onPlace(card.id, zoneId)}
                    disabled={disabled}
                    compact
                  />
                );
              })}
            </ZonePanel>
          );
        })}
      </div>
    </div>
  );
}
