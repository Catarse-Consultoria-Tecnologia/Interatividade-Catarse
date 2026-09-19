"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storeHostToken } from "@/hooks/useProfessorSession";

interface GameOption {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
}

export default function NovoProfessorPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSlug, setCreatingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => setError("Não foi possível carregar os jogos disponíveis."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(slug: string) {
    setCreatingSlug(slug);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Falha ao criar sala.");
      storeHostToken(data.code, data.hostToken);
      router.push(`/professor/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar sala.");
      setCreatingSlug(null);
    }
  }

  return (
    <main className="min-h-dvh bg-noir-fade bg-cork px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="label-eyebrow">catarse. · painel do professor</p>
          <h1 className="font-display text-2xl font-black text-paper-50">Criar uma nova sala</h1>
          <p className="mt-1 text-sm text-paper-300/70">
            Escolha a dinâmica que a turma vai investigar hoje.
          </p>
        </div>

        {loading && <p className="text-sm text-paper-300/60">Carregando jogos publicados…</p>}
        {error && <p className="text-sm text-alert-400">{error}</p>}

        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="dossier-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">{game.name}</h2>
                <p className="mt-1 text-sm text-ink-700">{game.description}</p>
                <p className="mt-1 text-[11px] font-mono uppercase tracking-wide text-ink-700/50">
                  versão {game.version}
                </p>
              </div>
              <button
                type="button"
                disabled={creatingSlug === game.slug}
                onClick={() => handleCreate(game.slug)}
                className="btn-primary shrink-0"
              >
                {creatingSlug === game.slug ? "Criando…" : "Criar sala"}
              </button>
            </div>
          ))}
          {!loading && games.length === 0 && (
            <p className="text-sm text-paper-300/60">Nenhum jogo publicado ainda.</p>
          )}
        </div>
      </div>
    </main>
  );
}
