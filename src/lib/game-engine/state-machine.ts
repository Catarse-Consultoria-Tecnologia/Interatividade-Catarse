import type { SessionStatus } from "@prisma/client";
import type { ProfessorActionType } from "@/types/realtime";

export class InvalidTransitionError extends Error {}

/**
 * EF-01 §51 — Estados da sessão:
 * CREATED → LOBBY → BRIEFING → ROUND_OPEN → ROUND_FROZEN → REVEAL → NEXT_ROUND → ... → FINAL → CLOSED
 * O estado é controlado inteiramente pelo servidor (RN-002).
 */
export function assertTransition(
  from: SessionStatus,
  action: ProfessorActionType,
): void {
  const allowed: Partial<Record<ProfessorActionType, SessionStatus[]>> = {
    START: ["LOBBY"],
    LOCK_LOBBY: ["LOBBY", "BRIEFING", "ROUND_OPEN", "ROUND_FROZEN", "REVEAL"],
    UNLOCK_LOBBY: ["LOBBY", "BRIEFING", "ROUND_OPEN", "ROUND_FROZEN", "REVEAL"],
    REMOVE_PARTICIPANT: [
      "LOBBY",
      "BRIEFING",
      "ROUND_OPEN",
      "ROUND_FROZEN",
      "REVEAL",
      "FINAL",
    ],
    RENAME_PARTICIPANT: [
      "LOBBY",
      "BRIEFING",
      "ROUND_OPEN",
      "ROUND_FROZEN",
      "REVEAL",
      "FINAL",
    ],
    RELEASE_CLUE: ["ROUND_OPEN", "ROUND_FROZEN"],
    FREEZE: ["ROUND_OPEN"],
    PAUSE: ["ROUND_OPEN"],
    RESUME: ["ROUND_FROZEN"],
    SHOW_DISTRIBUTION: ["ROUND_OPEN", "ROUND_FROZEN", "REVEAL"],
    REVEAL: ["ROUND_FROZEN"],
    NEXT_ROUND: ["BRIEFING", "REVEAL"],
    FINISH: ["ROUND_OPEN", "ROUND_FROZEN", "REVEAL", "BRIEFING"],
    CLOSE: ["FINAL"],
    TOGGLE_SOUND: [
      "LOBBY",
      "BRIEFING",
      "ROUND_OPEN",
      "ROUND_FROZEN",
      "REVEAL",
      "FINAL",
    ],
    SET_TIMER: ["BRIEFING", "ROUND_OPEN", "ROUND_FROZEN"],
    CLEAR_TIMER: ["BRIEFING", "ROUND_OPEN", "ROUND_FROZEN"],
  };

  const validFrom = allowed[action];
  if (!validFrom || !validFrom.includes(from)) {
    throw new InvalidTransitionError(
      `Ação "${action}" não é permitida a partir do estado "${from}".`,
    );
  }
}
