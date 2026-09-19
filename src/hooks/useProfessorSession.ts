"use client";

import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/realtime/client";
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
  const [state, setState] = useState<ProfessorStateDTO | null>(null);

  useEffect(() => {
    if (!hostToken) return;
    const socket = getSocket();
    setStatus("authenticating");

    function onProfessorState(s: ProfessorStateDTO) {
      setState(s);
      setStatus("authenticated");
    }
    function onError(payload: { message: string }) {
      setError(payload.message);
    }

    socket.on("professor:state", onProfessorState);
    socket.on("error:action", onError);

    function auth() {
      socket.emit("professor:auth", { code, hostToken: hostToken! }, (res) => {
        if (!res.ok) {
          setStatus("error");
          setError(res.message);
        }
      });
    }
    if (socket.connected) auth();
    else socket.once("connect", auth);

    return () => {
      socket.off("professor:state", onProfessorState);
      socket.off("error:action", onError);
    };
  }, [code, hostToken]);

  const runAction = useCallback(
    (action: ProfessorActionType, payload?: Record<string, unknown>) => {
      if (!hostToken) return;
      getSocket().emit("professor:action", { code, hostToken, action, payload });
    },
    [code, hostToken],
  );

  return { status, error, state, runAction };
}
