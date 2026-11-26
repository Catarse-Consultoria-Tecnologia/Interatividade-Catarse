// Contrato compartilhado entre servidor (Socket.IO) e cliente (React).
// Mantido sem dependências do Prisma Client para poder ser importado no browser.

export type SessionStatus =
  | "CREATED"
  | "LOBBY"
  | "BRIEFING"
  | "ROUND_OPEN"
  | "ROUND_FROZEN"
  | "REVEAL"
  | "NEXT_ROUND"
  // Sessão de jogo autoguiado (sem rodadas em lockstep) em andamento — ver Operação Gênesis.
  | "ACTIVE"
  | "FINAL"
  | "CLOSED";

export type RoundKey = 1 | 2 | 3 | 4;

export const ROUND_LABELS: Record<RoundKey, string> = {
  1: "Hipótese inicial",
  2: "Pistas",
  3: "Mesa de evidências",
  4: "Caso Aurora",
};

export interface ZoneDTO {
  id: string;
  key: string;
  name: string;
  subtitle: string;
  description: string;
  order: number;
  isFallback: boolean;
  color: string | null;
}

export interface ClueDTO {
  id: string;
  order: number;
  title: string;
  text: string;
}

export interface CardDTO {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  description: string;
  cardType: "ENTITY" | "INSTITUTION_TYPE" | "CONCEPT" | "CASE";
  technicalNote: string | null;
  order: number;
  /** Só preenchido depois que a pista correspondente foi liberada nesta sessão. */
  releasedClues: ClueDTO[];
  totalClues: number;
}

export interface EvidenceDTO {
  id: string;
  key: string;
  title: string;
  description: string;
  strength: "STRONG" | "COMPLEMENTARY" | "WEAK" | "DECOY";
}

export interface ScenarioDocumentDTO {
  id: string;
  key: string;
  title: string;
  text: string;
}

export interface ScenarioItemDTO {
  id: string;
  order: number;
  service: string;
}

export interface ScenarioDTO {
  id: string;
  title: string;
  description: string;
  documents: ScenarioDocumentDTO[];
  items: ScenarioItemDTO[];
}

export interface GameContentDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  zones: ZoneDTO[];
  cards: CardDTO[];
  evidences: EvidenceDTO[];
  scenario: ScenarioDTO;
}

export interface ParticipantSummaryDTO {
  id: string;
  name: string;
  connected: boolean;
  removed: boolean;
  joinedAt: string;
}

export interface CardDistributionDTO {
  cardId: string;
  totalAnswers: number;
  byZone: Record<string, number>; // zoneId -> contagem
  topZoneId: string | null;
  divergent: boolean; // nenhuma zona concentra >= 60% das respostas
}

export interface ScenarioItemAnswerDTO {
  responsavel: string;
  tipo: string;
  supervisor: string;
  evidenceTitle: string | null;
  insufficientIsValid: boolean;
}

/** Estado público, visto por participantes e telão — nunca inclui respostas individuais alheias. */
export interface PublicRoomState {
  code: string;
  status: SessionStatus;
  currentRound: RoundKey | 0;
  totalRounds: number;
  lobbyLocked: boolean;
  soundEnabled: boolean;
  distributionVisible: boolean;
  participantCount: number;
  participants: ParticipantSummaryDTO[];
  game: GameContentDTO;
  /** Só populado quando o professor aciona "mostrar distribuição" ou após revelar a rodada. */
  distribution: CardDistributionDTO[] | null;
  /** Populado a partir da rodada 2 revelada em diante. */
  revealedZoneByCard: Record<string, string> | null;
  /** Populado só depois que a rodada 4 (caso Aurora) é revelada. */
  revealedScenarioAnswers: Record<string, ScenarioItemAnswerDTO> | null;
  finished: boolean;
  classReport: ClassReportDTO | null;
  roundTimerEndsAt: string | null;
}

export interface MyCardStateDTO {
  cardId: string;
  zoneId: string | null;
  isRevision: boolean;
  updatedAt: string;
}

export interface MyEvidenceStateDTO {
  cardId: string;
  evidenceIds: string[];
}

export interface MyScenarioResponseDTO {
  scenarioItemId: string;
  responsavel: string;
  tipo: string;
  supervisor: string;
  evidenceKey: string | null;
  markedInsufficient: boolean;
  justification: string;
}

export interface MyStateDTO {
  participantId: string;
  name: string;
  placements: MyCardStateDTO[];
  evidenceAssociations: MyEvidenceStateDTO[];
  scenarioResponses: MyScenarioResponseDTO[];
  totalScore: number;
  report: IndividualReportDTO | null;
}

export interface IndividualReportDTO {
  hypothesesAnalyzed: number;
  hypothesesRevised: number;
  evidencesCorrect: number;
  insufficientCorrect: number;
  institutionalReadingPercent: number;
  totalScore: number;
  badges: { key: string; title: string; description: string }[];
  revisionHighlights: { cardTitle: string; from: string; to: string }[];
}

export interface ClassReportDTO {
  totalParticipants: number;
  mostConsolidated: { cardId: string; cardTitle: string; correctPercent: number }[];
  mostDivergent: { cardId: string; cardTitle: string; correctPercent: number }[];
  averageScore: number;
  insufficientRecognitionRate: number;
  revisionRate: number;
}

export interface ScoreBreakdownEntryDTO {
  category: string;
  points: number;
  cardId: string | null;
  note: string | null;
  createdAt: string;
}

export interface ProfessorParticipantRowDTO {
  id: string;
  name: string;
  connected: boolean;
  removed: boolean;
  answeredCurrentRound: number;
  totalScore: number;
}

/** Estado privado, enviado só para o socket autenticado como professor daquela sessão. */
export interface ProfessorStateDTO extends PublicRoomState {
  hostToken: string;
  participantsDetailed: ProfessorParticipantRowDTO[];
  distributionAlways: CardDistributionDTO[];
  timeline: TimelineEventDTO[];
  releasedClueIdsByCard: Record<string, string[]>;
}

export interface TimelineEventDTO {
  id: string;
  type: string;
  participantName: string | null;
  cardTitle: string | null;
  createdAt: string;
  payload: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Eventos Socket.IO
// ---------------------------------------------------------------------------

export interface ServerToClientEvents {
  "room:state": (state: PublicRoomState) => void;
  "me:state": (state: MyStateDTO) => void;
  "professor:state": (state: ProfessorStateDTO) => void;
  "error:action": (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  "viewer:join": (
    payload: { code: string },
    ack: (res: { ok: true } | { ok: false; message: string }) => void,
  ) => void;
  "participant:join": (
    payload: { code: string; name: string; existingToken?: string },
    ack: (
      res: { ok: true; token: string } | { ok: false; message: string },
    ) => void,
  ) => void;
  "professor:auth": (
    payload: { code: string; hostToken: string },
    ack: (res: { ok: true } | { ok: false; message: string }) => void,
  ) => void;
  "board:place": (payload: {
    code: string;
    token: string;
    cardId: string;
    zoneId: string;
  }) => void;
  "evidence:toggle": (payload: {
    code: string;
    token: string;
    cardId: string;
    evidenceId: string;
  }) => void;
  "scenario:respond": (payload: {
    code: string;
    token: string;
    scenarioItemId: string;
    responsavel?: string;
    tipo?: string;
    supervisor?: string;
    evidenceKey?: string | null;
    markedInsufficient?: boolean;
    justification?: string;
  }) => void;
  "professor:action": (payload: {
    code: string;
    hostToken: string;
    action: ProfessorActionType;
    payload?: Record<string, unknown>;
  }) => void;
}

export type ProfessorActionType =
  | "START"
  | "LOCK_LOBBY"
  | "UNLOCK_LOBBY"
  | "REMOVE_PARTICIPANT"
  | "RENAME_PARTICIPANT"
  | "RELEASE_CLUE"
  | "FREEZE"
  | "RESUME"
  | "SHOW_DISTRIBUTION"
  | "REVEAL"
  | "NEXT_ROUND"
  | "PAUSE"
  | "FINISH"
  | "CLOSE"
  | "TOGGLE_SOUND"
  | "SET_TIMER"
  | "CLEAR_TIMER";
