"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/realtime/supabase-browser";
import { participantChannel, roomChannel, REALTIME_EVENT } from "@/lib/realtime/channels";
import { useStableState } from "./useStableState";
import type { MyStateDTO, PublicRoomState } from "@/types/realtime";

function tokenKey(code: string) {
  return `catarse:participant-token:${code.toUpperCase()}`;
}

export function getStoredParticipantToken(code: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

function storeParticipantToken(code: string, token: string) {
  try {
    window.localStorage.setItem(tokenKey(code), token);
  } catch {
    /* localStorage indisponível (modo privado) — reconexão simplesmente não persiste */
  }
}

export type JoinStatus = "idle" | "joining" | "joined" | "error";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Erro inesperado.");
  return data as T;
}

export function useParticipantSession(code: string) {
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [room, setRoom] = useStableState<PublicRoomState>();
  const [me, setMe] = useStableState<MyStateDTO>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback(
    (t: string) => {
      tokenRef.current = t;
      setTokenState(t);
      storeParticipantToken(code, t);
    },
    [code],
  );

  const refetchState = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    try {
      const res = await fetch(`/api/rooms/${code}/state?token=${encodeURIComponent(t)}`);
      const data = await res.json();
      if (res.ok) {
        setRoom(data.room);
        setMe(data.me);
      }
    } catch {
      /* a atualização em tempo real cobre o resto */
    }
  }, [code]);

  const join = useCallback(
    async (name: string) => {
      setJoinStatus("joining");
      setJoinError(null);
      try {
        const existingToken = getStoredParticipantToken(code) ?? undefined;
        const { token: newToken } = await postJson<{ token: string }>(`/api/rooms/${code}/join`, {
          name,
          existingToken,
        });
        setToken(newToken);
        await refetchState();
        setJoinStatus("joined");
      } catch (err) {
        setJoinStatus("error");
        setJoinError(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
      }
    },
    [code, refetchState, setToken],
  );

  // Reconexão silenciosa: se já existe token salvo, tenta retomar sem pedir nome de novo.
  useEffect(() => {
    const existingToken = getStoredParticipantToken(code);
    if (!existingToken || joinStatus !== "idle") return;
    setJoinStatus("joining");
    postJson<{ token: string }>(`/api/rooms/${code}/join`, { name: "", existingToken })
      .then(async ({ token: newToken }) => {
        setToken(newToken);
        await refetchState();
        setJoinStatus("joined");
      })
      .catch(() => setJoinStatus("idle"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Assina os canais de Realtime assim que o token é conhecido; sem Supabase configurado,
  // cai para polling (o próprio ator já atualiza a tela via refetchState nas ações).
  useEffect(() => {
    if (!token) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const interval = setInterval(refetchState, 4000);
      return () => clearInterval(interval);
    }
    const channel = supabase
      .channel(roomChannel(code))
      .on("broadcast", { event: REALTIME_EVENT.ROOM_STATE }, ({ payload }) =>
        setRoom(payload as PublicRoomState),
      )
      .subscribe();
    const meChannel = supabase
      .channel(participantChannel(token))
      .on("broadcast", { event: REALTIME_EVENT.ME_STATE }, ({ payload }) => setMe(payload as MyStateDTO))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(meChannel);
    };
  }, [code, token, refetchState]);

  const runAction = useCallback(
    async (body: Record<string, unknown>) => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const res = await fetch(`/api/rooms/${code}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t, ...body }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setActionError(data.message ?? "Erro inesperado.");
        }
      } catch {
        setActionError("Falha de conexão. Tente novamente.");
      }
      void refetchState();
    },
    [code, refetchState],
  );

  const placeCard = useCallback(
    (cardId: string, zoneId: string) => runAction({ type: "PLACE_CARD", cardId, zoneId }),
    [runAction],
  );

  const toggleEvidence = useCallback(
    (cardId: string, evidenceId: string) => runAction({ type: "TOGGLE_EVIDENCE", cardId, evidenceId }),
    [runAction],
  );

  const respondScenario = useCallback(
    (
      scenarioItemId: string,
      patch: Partial<{
        responsavel: string;
        tipo: string;
        supervisor: string;
        evidenceKey: string;
        markedInsufficient: boolean;
        justification: string;
      }>,
    ) => runAction({ type: "RESPOND_SCENARIO", scenarioItemId, ...patch }),
    [runAction],
  );

  return { joinStatus, joinError, room, me, actionError, join, placeCard, toggleEvidence, respondScenario };
}
