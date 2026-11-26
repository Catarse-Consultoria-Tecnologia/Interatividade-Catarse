import { NextResponse } from "next/server";
import { z } from "zod";
import { GameServiceError, joinParticipant } from "@/lib/genesis/session-service";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(12),
  name: z.string().trim().min(1).max(40),
  existingToken: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Informe o código da sala e seu nome." }, { status: 400 });
  }

  try {
    const result = await joinParticipant(parsed.data.code, parsed.data.name, parsed.data.existingToken);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível entrar na sala." }, { status: 500 });
  }
}
