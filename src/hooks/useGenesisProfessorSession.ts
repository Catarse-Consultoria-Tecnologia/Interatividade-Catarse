"use client";

import { useCallback, useEffect, useState } from "react";
import type { GenesisProfessorActionType, GenesisProfessorStateDTO } from "@/lib/genesis/session-service";

const POLL_INTERVAL_MS = 5000;

export type GenesisProfessorStatus = "loading" | "ready" | "error";

export function useGenesisProfessorSession(code: string, hostToken: string | null) {
  const [status, setStatus] = useState<GenesisProfessorStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<GenesisProfessorStateDTO | null>(null);

  const fetchState = useCallback(async () => {
    if (!hostToken) return;
    try {
      const res = await fetch(
        `/api/genesis/professor?code=${encodeURIComponent(code)}&hostToken=${encodeURIComponent(hostToken)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Não foi possível abrir o painel.");
      setState(data as GenesisProfessorStateDTO);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o painel.");
      setStatus("error");
    }
  }, [code, hostToken]);

  useEffect(() => {
    if (!hostToken) return;
    void fetchState();
    const interval = setInterval(() => void fetchState(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hostToken, fetchState]);

  const runAction = useCallback(
    async (action: GenesisProfessorActionType, payload?: Record<string, unknown>) => {
      if (!hostToken) return;
      try {
        const res = await fetch("/api/genesis/professor/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, hostToken, action, payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Não foi possível executar a ação.");
        await fetchState();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível executar a ação.");
      }
    },
    [code, hostToken, fetchState],
  );

  return { status, error, state, runAction };
}
