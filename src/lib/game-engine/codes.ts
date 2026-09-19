import { customAlphabet } from "nanoid";

// Sem caracteres ambíguos (0/O, 1/I) — pensado para ser digitado em sala de aula.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomCodeSuffix = customAlphabet(ROOM_CODE_ALPHABET, 4);

/** RN-010: identificador de sessão único; RNF de segurança: não previsível. */
export function generateRoomCode(gamePrefix: string): string {
  const prefix = gamePrefix.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase() || "JGO";
  return `${prefix}${roomCodeSuffix()}`;
}

const secretAlphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const secretGenerator = customAlphabet(secretAlphabet, 32);

/** Segredo não adivinhável usado como token de professor (hostToken) ou de participante. */
export function generateSecretToken(): string {
  return secretGenerator();
}
