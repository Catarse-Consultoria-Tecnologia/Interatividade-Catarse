import type { Server as HTTPServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/realtime";
import * as sessionService from "@/lib/game-engine/session-service";

interface SocketData {
  code?: string;
  role?: "participant" | "professor" | "viewer";
  token?: string;
  hostToken?: string;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

function roomName(code: string) {
  return `session:${code}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof sessionService.GameServiceError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erro inesperado. Tente novamente.";
}

async function guarded(socket: AppSocket, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    socket.emit("error:action", { message: errorMessage(err) });
  }
}

/** Reenvia o estado atualizado para todos os sockets conectados a uma sala. */
async function pushState(io: AppServer, rawCode: string) {
  const code = rawCode.toUpperCase();
  const room = roomName(code);

  try {
    const publicState = await sessionService.buildPublicRoomState(code);
    io.to(room).emit("room:state", publicState);
  } catch {
    return; // sala inexistente — nada a fazer
  }

  for (const s of io.sockets.sockets.values()) {
    if (s.data.code !== code) continue;

    if (s.data.role === "participant" && s.data.token) {
      const token = s.data.token;
      try {
        const mine = await sessionService.buildMyState(code, token);
        s.emit("me:state", mine);
      } catch {
        // participante pode ter sido removido — ignora silenciosamente
      }
    } else if (s.data.role === "professor" && s.data.hostToken) {
      const hostToken = s.data.hostToken;
      try {
        const prof = await sessionService.buildProfessorState(code, hostToken);
        s.emit("professor:state", prof);
      } catch {
        // ignora
      }
    }
  }
}

export function attachRealtimeServer(httpServer: HTTPServer): AppServer {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const io: AppServer = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: allowedOrigin && process.env.NODE_ENV === "production" ? allowedOrigin : "*",
    },
    // Sala de aula real pode ter conexões instáveis (Wi-Fi compartilhado) — RNF-005.
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.on("connection", (socket: AppSocket) => {
    socket.on("viewer:join", async (payload, ack) => {
      try {
        const code = payload.code.toUpperCase();
        socket.data.code = code;
        socket.data.role = "viewer";
        await socket.join(roomName(code));
        ack({ ok: true });
        const publicState = await sessionService.buildPublicRoomState(code);
        socket.emit("room:state", publicState);
      } catch (err) {
        ack({ ok: false, message: errorMessage(err) });
      }
    });

    socket.on("participant:join", async (payload, ack) => {
      try {
        const { token } = await sessionService.joinParticipant(
          payload.code,
          payload.name,
          payload.existingToken,
        );
        const code = payload.code.toUpperCase();
        socket.data.code = code;
        socket.data.role = "participant";
        socket.data.token = token;
        await socket.join(roomName(code));
        ack({ ok: true, token });
        await pushState(io, code);
      } catch (err) {
        ack({ ok: false, message: errorMessage(err) });
      }
    });

    socket.on("professor:auth", async (payload, ack) => {
      try {
        await sessionService.authenticateProfessor(payload.code, payload.hostToken);
        const code = payload.code.toUpperCase();
        socket.data.code = code;
        socket.data.role = "professor";
        socket.data.hostToken = payload.hostToken;
        await socket.join(roomName(code));
        ack({ ok: true });
        await pushState(io, code);
      } catch (err) {
        ack({ ok: false, message: errorMessage(err) });
      }
    });

    socket.on("board:place", (payload) => {
      void guarded(socket, async () => {
        await sessionService.placeCard(payload.code, payload.token, payload.cardId, payload.zoneId);
        await pushState(io, payload.code);
      });
    });

    socket.on("evidence:toggle", (payload) => {
      void guarded(socket, async () => {
        await sessionService.toggleEvidence(
          payload.code,
          payload.token,
          payload.cardId,
          payload.evidenceId,
        );
        await pushState(io, payload.code);
      });
    });

    socket.on("scenario:respond", (payload) => {
      void guarded(socket, async () => {
        await sessionService.respondScenarioItem(payload.code, payload.token, payload.scenarioItemId, {
          responsavel: payload.responsavel,
          tipo: payload.tipo,
          supervisor: payload.supervisor,
          evidenceKey: payload.evidenceKey,
          markedInsufficient: payload.markedInsufficient,
          justification: payload.justification,
        });
        await pushState(io, payload.code);
      });
    });

    socket.on("professor:action", (payload) => {
      void guarded(socket, async () => {
        await sessionService.runProfessorAction(
          payload.code,
          payload.hostToken,
          payload.action,
          payload.payload,
        );
        await pushState(io, payload.code);
      });
    });

    socket.on("disconnect", () => {
      const { code, role, token } = socket.data;
      if (role === "participant" && code && token) {
        void sessionService
          .markParticipantConnection(code, token, false)
          .then(() => pushState(io, code))
          .catch(() => undefined);
      }
    });
  });

  return io;
}
