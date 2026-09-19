"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/realtime/supabase-browser";
import { professorChannel, REALTIME_EVENT } from "@/lib/realtime/channels";
import { useStableState } from "./useStableState";
import type { ProfessorActionType, ProfessorStateDTO } from "@/types/realtime";

function hostTokenKey(code: string) {
  return `catarse:host-token:${code.toUpperCase()}`;
}

export function storeHostToken(code: string, token: string) {
  try {
    window.localStorage.setItem(hostTokenKey(code), token);
  } catch {
    /* ignorado */
  }
}

export function getStoredHostToken(code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(hostTokenKey(code));
  } catch {
    return null;
  }
}

export type ProfessorAuthStatus = "idle" | "authenticating" | "authenticated" | "error";

export function useProfessorSession(code: string, hostToken: string | null) {
  const [status, setStatus] = useState<ProfessorAuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useStableState<ProfessorStateDTO>();

  const refetchState = useCallback(async () => {
    if (!hostToken) return;
    try {
      const res = await fetch(`/api/rooms/${code}/state?hostToken=${encodeURIComponent(hostToken)}`);
      const data = await res.json();
      if (res.ok) {
        setState(data.professor);
        setStatus("authenticated");
      } else {
        setStatus("error");
        setError(data.message ?? "Não foi possível abrir o painel.");
      }
    } catch {
      setStatus("error");
      setError("Falha de conexão.");
    }
  }, [code, hostToken]);

  useEffect(() => {
    if (!hostToken) return;
    setStatus("authenticating");
    void refetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, hostToken]);

  useEffect(() => {
    if (!hostToken) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const interval = setInterval(refetchState, 4000);
      return () => clearInterval(interval);
    }
    const channel = supabase
      .channel(professorChannel(hostToken))
      .on("broadcast", { event: REALTIME_EVENT.PROFESSOR_STATE }, ({ payload }) =>
        setState(payload as ProfessorStateDTO),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hostToken, refetchState]);

  const runAction = useCallback(
    async (action: ProfessorActionType, payload?: Record<string, unknown>) => {
      if (!hostToken) return;
      try {
        const res = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "PROFESSOR_ACTION", hostToken, action, payload }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) setError(data.message ?? "Erro inesperado.");
      } catch {
        setError("Falha de conexão. Tente novamente.");
      }
      void refetchState();
    },
    [code, hostToken, refetchState],
  );

  return { status, error, state, runAction };
}
