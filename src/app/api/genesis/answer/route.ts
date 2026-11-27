import { NextResponse } from "next/server";
import { z } from "zod";
import { GameServiceError, submitGenesisAnswer } from "@/lib/genesis/session-service";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(12),
  token: z.string().trim().min(1),
  questionId: z.string().trim().min(1),
  optionId: z.string().trim().min(1),
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
    const result = await submitGenesisAnswer(
      parsed.data.code,
      parsed.data.token,
      parsed.data.questionId,
      parsed.data.optionId,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível registrar a resposta." }, { status: 500 });
  }
}
