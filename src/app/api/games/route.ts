import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A lista de jogos publicados pode mudar a qualquer momento — nunca cachear/congelar
// esta resposta em build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const games = await prisma.game.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, name: true, description: true, version: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ games });
}
