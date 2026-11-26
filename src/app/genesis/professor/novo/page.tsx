"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { storeHostToken } from "@/hooks/useProfessorSession";

const GENESIS_GAME_SLUG = "operacao-genesis";

export default function GenesisNovoProfessorPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug: GENESIS_GAME_SLUG }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Falha ao criar sala.");
      storeHostToken(data.code, data.hostToken);
      router.push(`/genesis/professor/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar sala.");
      setCreating(false);
    }
  }

  return (
    <main className="min-h-dvh bg-off-white px-4 py-12 font-jakarta text-texto sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-azul-tecnico">
            Operação Gênesis · painel do professor
          </p>
          <h1 className="text-2xl font-black text-azul-institucional">Criar uma nova sala</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Cada sala acompanha o progresso de uma turma pelas 4 etapas da Operação Gênesis.
          </p>
        </div>

        {error && <p className="text-sm text-alert-500">{error}</p>}

        <div className="flex flex-col gap-3 rounded-card border border-borda bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-texto">Operação Gênesis</h2>
            <p className="mt-1 text-sm text-texto-secundario">
              Módulo 4 — Fundamentos de Dados e Bancos de Dados (DDL, DML, DQL e arquitetura de permissões).
            </p>
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreate}
            className="shrink-0 rounded-lg bg-azul-tecnico px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Criando…" : "Criar sala"}
          </button>
        </div>
      </div>
    </main>
  );
}
