"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/realtime/client";
import type { PublicRoomState } from "@/types/realtime";

export function useViewerSession(code: string) {
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    function onRoomState(state: PublicRoomState) {
      setRoom(state);
    }

    socket.on("room:state", onRoomState);

    function doJoin() {
      socket.emit("viewer:join", { code }, (res) => {
        if (!res.ok) setError(res.message);
      });
    }
    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);

    return () => {
      socket.off("room:state", onRoomState);
    };
  }, [code]);

  return { room, error };
}
