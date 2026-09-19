import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, GameServiceError } from "@/lib/game-engine/session-service";

const bodySchema = z.object({ gameSlug: z.string().min(1).max(80) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Informe o jogo desejado (gameSlug)." }, { status: 400 });
  }

  try {
    const session = await createSession(parsed.data.gameSlug);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível criar a sala." }, { status: 500 });
  }
}
