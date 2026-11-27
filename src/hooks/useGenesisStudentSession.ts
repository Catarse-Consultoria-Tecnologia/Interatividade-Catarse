"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredParticipantToken, storeParticipantToken } from "@/hooks/useParticipantSession";
import type { GenesisAnswerResultDTO, GenesisStudentStateDTO } from "@/lib/genesis/session-service";

const POLL_INTERVAL_MS = 5000;

export type GenesisJoinStatus = "idle" | "joining" | "joined" | "error";

export function useGenesisStudentSession(code: string) {
  const [joinStatus, setJoinStatus] = useState<GenesisJoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [state, setState] = useState<GenesisStudentStateDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const fetchState = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await fetch(`/api/genesis/state?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Não foi possível carregar a sala.");
      setState(data as GenesisStudentStateDTO);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível sincronizar com a sala.");
    }
  }, [code]);

  const join = useCallback(
    async (name: string) => {
      setJoinStatus("joining");
      setJoinError(null);
      try {
        const existingToken = getStoredParticipantToken(code) ?? undefined;
        const res = await fetch("/api/genesis/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name, existingToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Não foi possível entrar na sala.");
        tokenRef.current = data.token;
        storeParticipantToken(code, data.token);
        setJoinStatus("joined");
        await fetchState();
      } catch (err) {
        setJoinStatus("error");
        setJoinError(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
      }
    },
    [code, fetchState],
  );

  // Reconexão automática se já houver token salvo (refresh de página).
  useEffect(() => {
    const existingToken = getStoredParticipantToken(code);
    if (existingToken && joinStatus === "idle") {
      tokenRef.current = existingToken;
      setJoinStatus("joined");
      void fetchState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (joinStatus !== "joined") return;
    const interval = setInterval(() => void fetchState(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [joinStatus, fetchState]);

  const submitAnswer = useCallback(
    async (questionId: string, optionId: string): Promise<GenesisAnswerResultDTO | null> => {
      const token = tokenRef.current;
      if (!token) return null;
      setActionError(null);
      try {
        const res = await fetch("/api/genesis/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, token, questionId, optionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Não foi possível registrar a resposta.");
        await fetchState();
        return data as GenesisAnswerResultDTO;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Não foi possível registrar a resposta.");
        return null;
      }
    },
    [code, fetchState],
  );

  return { joinStatus, joinError, state, actionError, join, submitAnswer, refresh: fetchState };
}
