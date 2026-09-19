import { NextResponse } from "next/server";
import {
  buildMyState,
  buildProfessorState,
  buildPublicRoomState,
  GameServiceError,
} from "@/lib/game-engine/session-service";

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const hostToken = url.searchParams.get("hostToken");

  try {
    const room = await buildPublicRoomState(params.code);

    if (hostToken) {
      const professor = await buildProfessorState(params.code, hostToken);
      return NextResponse.json({ room, professor });
    }

    if (token) {
      const me = await buildMyState(params.code, token);
      return NextResponse.json({ room, me });
    }

    return NextResponse.json({ room });
  } catch (err) {
    if (err instanceof GameServiceError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ message: err.message }, { status });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ message: "Não foi possível carregar o estado da sala." }, { status: 500 });
  }
}
