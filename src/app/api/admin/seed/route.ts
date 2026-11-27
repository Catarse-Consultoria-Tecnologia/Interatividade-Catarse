import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedOperacaoSFN } from "../../../../../prisma/seed-operacao-sfn";
import { seedModulo3Processos } from "../../../../../prisma/seed-modulo3-processos";
import { seedGenesis } from "../../../../../prisma/seed-genesis";

// Popula/repopula o conteúdo do jogo em produção. Existe porque o passo de build da
// Vercel só roda `prisma migrate deploy` (schema), não `prisma db seed` (conteúdo) — e
// ambientes sem acesso TCP direto ao Postgres não conseguem rodar o seed manualmente.
// Protegida por um segredo para não virar um endpoint público de "resetar o jogo".
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "SEED_SECRET não configurado no ambiente." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  const provided = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (provided !== secret) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const sfn = await seedOperacaoSFN(prisma);
    const modulo3 = await seedModulo3Processos(prisma);
    const genesis = await seedGenesis(prisma);
    return NextResponse.json({ ok: true, result: { sfn, modulo3, genesis } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    const message = err instanceof Error ? err.message : "Erro inesperado ao popular o jogo.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
