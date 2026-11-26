import Link from "next/link";
import { GenesisJoinForm } from "@/components/genesis/GenesisJoinForm";

export const dynamic = "force-dynamic";

export default function GenesisLandingPage() {
  return (
    <main className="min-h-dvh bg-off-white font-jakarta text-texto">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-azul-tecnico">
            Módulo 4 · Fundamentos de Dados e Bancos de Dados
          </p>
          <h1 className="mt-1 text-3xl font-black text-azul-institucional sm:text-4xl">Operação Gênesis</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-texto-secundario">
            Você assume, como Engenheiro(a) de Dados Júnior, um trabalho de modelagem deixado pela metade no Azure
            SQL Database real da Horizonte Crédito.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
          <GenesisJoinForm />

          <div className="w-full max-w-sm space-y-4">
            <div className="rounded-card border border-borda bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Sobre a missão</p>
              <p className="mt-2 text-sm leading-relaxed text-texto-secundario">
                4 etapas — DDL, DML, DQL e arquitetura de permissões — cada uma com uma rodada de 5 questões. Os
                scripts são seus para copiar e rodar no Azure; o portal acompanha seu progresso.
              </p>
            </div>

            <Link
              href="/genesis/professor/novo"
              className="block w-full rounded-lg border border-borda bg-white px-4 py-2.5 text-center text-sm font-semibold text-texto transition hover:bg-cinza-calido"
            >
              Sou professor — criar uma sala
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
