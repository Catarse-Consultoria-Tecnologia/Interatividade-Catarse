"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Stamp } from "@/components/ui/Stamp";
import type { CardDTO, ZoneDTO } from "@/types/realtime";

const CARD_TYPE_LABEL: Record<CardDTO["cardType"], string> = {
  ENTITY: "Órgão / entidade",
  INSTITUTION_TYPE: "Tipo de instituição",
  CONCEPT: "Conceito especial",
  CASE: "Caso",
};

interface PickerCoords {
  top: number;
  left: number;
  width: number;
}

export function CardTile({
  card,
  zones,
  currentZoneId,
  isRevision,
  revealedZoneId,
  onPlace,
  disabled,
  compact,
}: {
  card: CardDTO;
  zones: ZoneDTO[];
  currentZoneId: string | null;
  isRevision: boolean;
  revealedZoneId?: string | null;
  onPlace: (zoneId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coords, setCoords] = useState<PickerCoords | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const currentZone = zones.find((z) => z.id === currentZoneId) ?? null;
  const isCorrect =
    revealedZoneId != null && currentZoneId != null && revealedZoneId === currentZoneId;
  const isRevealed = revealedZoneId != null;

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    setPickerOpen(true);
  }

  // Fecha o picker (em vez de reposicionar) se a página rolar ou redimensionar —
  // evita que ele fique "flutuando" fora do lugar após um scroll dentro de uma zona.
  useEffect(() => {
    if (!pickerOpen) return;
    function close() {
      setPickerOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pickerOpen]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    if (disabled) return;
    e.dataTransfer.setData("text/card-id", card.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="relative" data-testid={`card-${card.key}`} ref={triggerRef}>
      <div
        draggable={!disabled}
        onDragStart={handleDragStart}
        onClick={() => !disabled && (pickerOpen ? setPickerOpen(false) : openPicker())}
      >
        <motion.div
          layout
          whileTap={disabled ? undefined : { scale: 0.98 }}
          animate={currentZoneId ? { y: [-4, 0] } : {}}
          transition={{ duration: 0.2 }}
          className={clsx(
            "dossier-card cursor-pointer select-none p-3.5",
            compact ? "min-h-[92px]" : "min-h-[128px]",
            disabled && "cursor-default opacity-90",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label-eyebrow">{CARD_TYPE_LABEL[card.cardType]}</p>
              <h3 className="font-display text-lg font-bold leading-tight text-ink-900">
                {card.title}
              </h3>
              {card.subtitle && (
                <p className="mt-0.5 text-xs font-medium text-ink-700/70">{card.subtitle}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {isRevealed ? (
                <Stamp variant={isCorrect ? "confirm" : "alert"}>
                  {isCorrect ? "✓ Confirmado" : "Revisar"}
                </Stamp>
              ) : currentZoneId ? (
                <Stamp variant="gold">
                  {isRevision ? "Hipótese revisada" : "Hipótese registrada"}
                </Stamp>
              ) : null}
            </div>
          </div>

          {!compact && <p className="mt-2 text-sm leading-snug text-ink-700">{card.description}</p>}

          {card.releasedClues.length > 0 && (
            <div className="mt-2.5 space-y-1.5 border-t border-ink-900/10 pt-2.5">
              {card.releasedClues.map((clue) => (
                <p key={clue.id} className="text-xs leading-snug text-ink-700/90">
                  <span className="font-mono font-semibold text-navy-700">🔎 {clue.title}:</span>{" "}
                  {clue.text}
                </p>
              ))}
            </div>
          )}

          {isRevealed && card.technicalNote && (
            <p className="mt-2 rounded-md bg-info-500/10 px-2 py-1.5 text-xs leading-snug text-navy-800">
              {card.technicalNote}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink-700/50">
              {currentZone ? `Em: ${currentZone.name}` : "Toque para posicionar"}
            </span>
          </div>
        </motion.div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {pickerOpen && !disabled && coords && (
              <>
                {/* Camada invisível para fechar o picker ao tocar fora dele. */}
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
                  className="z-50 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-navy-800 p-2 shadow-card-lift"
                  data-testid="zone-picker"
                >
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlace(zone.id);
                        setPickerOpen(false);
                      }}
                      className={clsx(
                        "rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition",
                        zone.id === currentZoneId
                          ? "bg-gold-500 text-ink-900"
                          : "bg-white/5 text-paper-50 hover:bg-white/10",
                      )}
                    >
                      {zone.name}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
