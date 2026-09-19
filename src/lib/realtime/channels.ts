// Nomes de canal do Supabase Realtime. Iguais no servidor (que publica) e no
// navegador (que assina) — nenhum dos dois pode inventar um nome diferente.
//
// `room:{code}` é público (estado da sala, sem respostas individuais alheias).
// `me:{token}` e `professor:{hostToken}` só existem na prática para quem conhece o
// segredo (token/hostToken não são previsíveis — mesma lógica de RNF de segurança
// que já usávamos com as salas do Socket.IO).

export function roomChannel(code: string) {
  return `room:${code.toUpperCase()}`;
}

export function participantChannel(token: string) {
  return `me:${token}`;
}

export function professorChannel(hostToken: string) {
  return `professor:${hostToken}`;
}

export const REALTIME_EVENT = {
  ROOM_STATE: "room:state",
  ME_STATE: "me:state",
  PROFESSOR_STATE: "professor:state",
} as const;
