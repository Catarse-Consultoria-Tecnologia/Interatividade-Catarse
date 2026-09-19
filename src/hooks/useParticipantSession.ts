"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/realtime/client";
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

export function useParticipantSession(code: string) {
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [me, setMe] = useState<MyStateDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const join = useCallback(
    (name: string) => {
      setJoinStatus("joining");
      setJoinError(null);
      const socket = getSocket();
      const existingToken = getStoredParticipantToken(code) ?? undefined;

      function doJoin() {
        socket.emit("participant:join", { code, name, existingToken }, (res) => {
          if (res.ok) {
            tokenRef.current = res.token;
            storeParticipantToken(code, res.token);
            setJoinStatus("joined");
          } else {
            setJoinStatus("error");
            setJoinError(res.message);
          }
        });
      }

      if (socket.connected) doJoin();
      else socket.once("connect", doJoin);
    },
    [code],
  );

  useEffect(() => {
    const socket = getSocket();

    function onRoomState(state: PublicRoomState) {
      setRoom(state);
    }
    function onMyState(state: MyStateDTO) {
      setMe(state);
    }
    function onError(payload: { message: string }) {
      setActionError(payload.message);
    }

    socket.on("room:state", onRoomState);
    socket.on("me:state", onMyState);
    socket.on("error:action", onError);

    // Tenta reconectar automaticamente se já houver token salvo (refresh de página).
    const existingToken = getStoredParticipantToken(code);
    if (existingToken && joinStatus === "idle") {
      setJoinStatus("joining");
      const attempt = () => {
        socket.emit("participant:join", { code, name: "", existingToken }, (res) => {
          if (res.ok) {
            tokenRef.current = res.token;
            setJoinStatus("joined");
          } else {
            setJoinStatus("idle");
          }
        });
      };
      if (socket.connected) attempt();
      else socket.once("connect", attempt);
    }

    return () => {
      socket.off("room:state", onRoomState);
      socket.off("me:state", onMyState);
      socket.off("error:action", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const placeCard = useCallback(
    (cardId: string, zoneId: string) => {
      const token = tokenRef.current;
      if (!token) return;
      getSocket().emit("board:place", { code, token, cardId, zoneId });
    },
    [code],
  );

  const toggleEvidence = useCallback(
    (cardId: string, evidenceId: string) => {
      const token = tokenRef.current;
      if (!token) return;
      getSocket().emit("evidence:toggle", { code, token, cardId, evidenceId });
    },
    [code],
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
    ) => {
      const token = tokenRef.current;
      if (!token) return;
      getSocket().emit("scenario:respond", { code, token, scenarioItemId, ...patch });
    },
    [code],
  );

  return { joinStatus, joinError, room, me, actionError, join, placeCard, toggleEvidence, respondScenario };
}
