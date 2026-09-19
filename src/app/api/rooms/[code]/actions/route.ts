import { NextResponse } from "next/server";
import { z } from "zod";
import {
  GameServiceError,
  placeCard,
  respondScenarioItem,
  runProfessorAction,
  toggleEvidence,
} from "@/lib/game-engine/session-service";
import type { ProfessorActionType } from "@/types/realtime";
import { broadcastAfterParticipantAction, broadcastAfterProfessorAction } from "@/lib/realtime/broadcast";

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PLACE_CARD"),
    token: z.string().min(1),
    cardId: z.string().min(1),
    zoneId: z.string().min(1),
  }),
  z.object({
    type: z.literal("TOGGLE_EVIDENCE"),
    token: z.string().min(1),
    cardId: z.string().min(1),
    evidenceId: z.string().min(1),
  }),
  z.object({
    type: z.literal("RESPOND_SCENARIO"),
    token: z.string().min(1),
    scenarioItemId: z.string().min(1),
    responsavel: z.string().max(500).optional(),
    tipo: z.string().max(500).optional(),
    supervisor: z.string().max(500).optional(),
    evidenceKey: z.string().max(80).nullish(),
    markedInsufficient: z.boolean().optional(),
    justification: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("PROFESSOR_ACTION"),
    hostToken: z.string().min(1),
    action: z.string().min(1),
    payload: z.record(z.unknown()).optional(),
  }),
]);

export async function POST(request: Request, { params }: { params: { code: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
  }
  const data = parsed.data;
  const code = params.code;

  try {
    switch (data.type) {
      case "PLACE_CARD": {
        await placeCard(code, data.token, data.cardId, data.zoneId);
        await broadcastAfterParticipantAction(code, data.token);
        break;
      }
      case "TOGGLE_EVIDENCE": {
        await toggleEvidence(code, data.token, data.cardId, data.evidenceId);
        await broadcastAfterParticipantAction(code, data.token);
        break;
      }
      case "RESPOND_SCENARIO": {
        await respondScenarioItem(code, data.token, data.scenarioItemId, {
          responsavel: data.responsavel,
          tipo: data.tipo,
          supervisor: data.supervisor,
          evidenceKey: data.evidenceKey,
          markedInsufficient: data.markedInsufficient,
          justification: data.justification,
        });
        await broadcastAfterParticipantAction(code, data.token);
        break;
      }
      case "PROFESSOR_ACTION": {
        await runProfessorAction(
          code,
          data.hostToken,
          data.action as ProfessorActionType,
          data.payload ?? {},
        );
        await broadcastAfterProfessorAction(code, data.hostToken);
        break;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ ok: false, message: "Erro inesperado. Tente novamente." }, { status: 500 });
  }
}
