import "server-only";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "./supabase-admin";
import { roomChannel, participantChannel, professorChannel, REALTIME_EVENT } from "./channels";
import {
  buildMyState,
  buildProfessorState,
  buildPublicRoomState,
} from "@/lib/game-engine/session-service";

/**
 * Publica um evento de Broadcast do Supabase Realtime num canal. Não assina o canal
 * (nada fica "conectado" pendurado numa função serverless) — só publica via REST,
 * que é o caminho recomendado pela Supabase para publicar a partir do servidor.
 *
 * Nunca deixa uma falha de broadcast derrubar a mutação que já foi salva no banco —
 * a atualização em tempo real é um extra; o estado em si já está correto no Postgres
 * e qualquer cliente pega o valor certo na próxima busca (GET /state).
 */
async function send(channelName: string, event: string, payload: unknown) {
  try {
    const supabase = getSupabaseAdminClient();
    const channel = supabase.channel(channelName);
    await channel.send({ type: "broadcast", event, payload });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[realtime] falha ao publicar em "${channelName}":`, err);
  }
}

export async function broadcastPublicState(code: string) {
  const state = await buildPublicRoomState(code);
  await send(roomChannel(code), REALTIME_EVENT.ROOM_STATE, state);
  return state;
}

export async function broadcastMyState(code: string, token: string) {
  const state = await buildMyState(code, token);
  await send(participantChannel(token), REALTIME_EVENT.ME_STATE, state);
  return state;
}

export async function broadcastProfessorState(code: string, hostToken: string) {
  const state = await buildProfessorState(code, hostToken);
  await send(professorChannel(hostToken), REALTIME_EVENT.PROFESSOR_STATE, state);
  return state;
}

async function activeParticipantTokens(code: string): Promise<string[]> {
  const participants = await prisma.participant.findMany({
    where: { session: { code: code.toUpperCase() }, removed: false },
    select: { token: true },
  });
  return participants.map((p) => p.token);
}

async function hostTokenForCode(code: string): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { code: code.toUpperCase() },
    select: { hostToken: true },
  });
  return session?.hostToken ?? null;
}

/**
 * Depois de uma ação de participante: estado público, o próprio "me", e o painel do
 * professor (o participante nunca sabe o hostToken — é buscado no servidor).
 */
export async function broadcastAfterParticipantAction(code: string, actingToken: string) {
  const hostToken = await hostTokenForCode(code);
  await Promise.all([
    broadcastPublicState(code),
    broadcastMyState(code, actingToken),
    hostToken ? broadcastProfessorState(code, hostToken) : Promise.resolve(),
  ]);
}

/**
 * Depois de uma ação do professor: estado público, painel do professor, e o "me" de
 * todo mundo (ações do professor são raras — revelar, avançar, finalizar — então o
 * fan-out pra toda a turma não é um caminho quente).
 */
export async function broadcastAfterProfessorAction(code: string, hostToken: string) {
  const tokens = await activeParticipantTokens(code);
  await Promise.all([
    broadcastPublicState(code),
    broadcastProfessorState(code, hostToken),
    ...tokens.map((token) => broadcastMyState(code, token)),
  ]);
}

/** Ao entrar na sala: estado público, o "me" de quem entrou, e o painel do professor. */
export async function broadcastAfterJoin(code: string, token: string) {
  await broadcastAfterParticipantAction(code, token);
}
