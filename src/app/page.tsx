import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JoinForm } from "@/components/home/JoinForm";

// A lista de jogos publicados muda em tempo de execução (cadastro futuro de novos
// jogos) — não deixar o Next.js congelar esta página como estática em build time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredGame = await prisma.game.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-dvh bg-noir-fade bg-cork">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="label-eyebrow">catarse.</p>
          <h1 className="font-display text-3xl font-black italic text-paper-50 sm:text-4xl">
            Plataforma de Interatividade
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-paper-300/70">
            Jogos e dinâmicas investigativas de pré/pós-aula para a Formação Integrada Catarse.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
          <JoinForm />

          <div className="w-full max-w-sm space-y-4">
            {featuredGame && (
              <div className="cork-panel p-5">
                <p className="label-eyebrow">Missão em cartaz</p>
                <h2 className="font-display text-lg font-bold text-paper-50">{featuredGame.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-paper-300/80">
                  {featuredGame.description}
                </p>
              </div>
            )}

            <Link
              href="/professor/novo"
              className="btn-secondary block w-full text-center"
            >
              Sou professor — criar uma sala
            </Link>

            <Link
              href="/genesis"
              className="btn-secondary block w-full text-center"
            >
              Módulo 4 — Operação Gênesis ↗
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
