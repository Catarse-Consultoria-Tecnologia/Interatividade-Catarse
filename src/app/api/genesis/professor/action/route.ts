import { NextResponse } from "next/server";
import { z } from "zod";
import { GameServiceError, runGenesisProfessorAction } from "@/lib/genesis/session-service";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(12),
  hostToken: z.string().trim().min(1),
  action: z.enum(["START", "LOCK_LOBBY", "UNLOCK_LOBBY", "REMOVE_PARTICIPANT", "RENAME_PARTICIPANT", "CLOSE"]),
  payload: z.record(z.unknown()).optional(),
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
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  try {
    await runGenesisProfessorAction(
      parsed.data.code,
      parsed.data.hostToken,
      parsed.data.action,
      parsed.data.payload ?? {},
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível executar a ação." }, { status: 500 });
  }
}
