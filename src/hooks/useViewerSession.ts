"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/realtime/supabase-browser";
import { roomChannel, REALTIME_EVENT } from "@/lib/realtime/channels";
import { useStableState } from "./useStableState";
import type { PublicRoomState } from "@/types/realtime";

const POLL_FALLBACK_MS = 4000;

export function useViewerSession(code: string) {
  const [room, setRoom] = useStableState<PublicRoomState>();
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}/state`);
      const data = await res.json();
      if (res.ok) setRoom(data.room);
      else setError(data.message ?? "Sala não encontrada.");
    } catch {
      setError("Falha de conexão.");
    }
  }, [code]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  // Assina o Realtime quando disponível; senão cai para polling (degradação graciosa).
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const interval = setInterval(fetchState, POLL_FALLBACK_MS);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel(roomChannel(code))
      .on("broadcast", { event: REALTIME_EVENT.ROOM_STATE }, ({ payload }) =>
        setRoom(payload as PublicRoomState),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, fetchState]);

  return { room, error };
}
