import { NextResponse } from "next/server";
import { GameServiceError, buildGenesisStudentState } from "@/lib/genesis/session-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (!code || !token) {
    return NextResponse.json({ message: "code e token são obrigatórios." }, { status: 400 });
  }

  try {
    const state = await buildGenesisStudentState(code, token);
    return NextResponse.json(state);
  } catch (err) {
    if (err instanceof GameServiceError) {
      return NextResponse.json({ message: err.message, code: err.code }, { status: 400 });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível carregar a sala." }, { status: 500 });
  }
}
