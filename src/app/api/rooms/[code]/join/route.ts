import { NextResponse } from "next/server";
import { z } from "zod";
import { joinParticipant, GameServiceError } from "@/lib/game-engine/session-service";
import { broadcastAfterJoin } from "@/lib/realtime/broadcast";

const bodySchema = z.object({
  name: z.string().trim().max(40).optional().default(""),
  existingToken: z.string().trim().max(80).optional(),
});

export async function POST(request: Request, { params }: { params: { code: string } }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  try {
    const { token } = await joinParticipant(params.code, parsed.data.name, parsed.data.existingToken);
    await broadcastAfterJoin(params.code, token);
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível entrar na sala." }, { status: 500 });
  }
}
