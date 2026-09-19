"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Cronômetro informativo, sincronizado a partir de um deadline vindo do servidor. */
export function Timer({ endsAt, className }: { endsAt: string | null; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const remainingMs = new Date(endsAt).getTime() - now;
  const done = remainingMs <= 0;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold",
        done ? "border-alert-500/60 text-alert-400" : "border-gold-500/50 text-gold-500",
        className,
      )}
    >
      ⏱ {done ? "Tempo esgotado" : formatRemaining(remainingMs)}
    </span>
  );
}
