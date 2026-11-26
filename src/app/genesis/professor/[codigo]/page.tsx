"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStoredHostToken } from "@/hooks/useProfessorSession";
import { useGenesisProfessorSession } from "@/hooks/useGenesisProfessorSession";
import { GenesisQRCode } from "@/components/genesis/GenesisQRCode";
import { ProfessorStudentsTable, AttentionPointsPanel } from "@/components/genesis/ProfessorDashboard";

export default function GenesisProfessorPage() {
  const params = useParams<{ codigo: string }>();
  const code = params.codigo.toUpperCase();
  const [hostToken, setHostToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setHostToken(getStoredHostToken(code));
  }, [code]);

  const { status, error, state, runAction } = useGenesisProfessorSession(code, hostToken ?? null);

  if (hostToken === undefined) return <Message title="Carregando…" body="" />;

  if (hostToken === null) {
    return (
      <Message
        title="Chave de professor não encontrada"
        body="Abra o link de controle desta sala no mesmo navegador em que ela foi criada, em /genesis/professor/novo."
      />
    );
  }

  if (status === "error") {
    return <Message title="Não foi possível abrir o painel" body={error ?? "Erro desconhecido."} />;
  }

  if (!state) return <Message title="Conectando ao painel do professor…" body="" />;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${appUrl}/genesis/sala/${state.code}`;

  return (
    <main className="min-h-dvh bg-off-white px-4 py-8 font-jakarta text-texto sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-azul-tecnico">
              Operação Gênesis · painel do professor
            </p>
            <h1 className="text-2xl font-black text-azul-institucional">Sala {state.code}</h1>
          </div>
          <div className="flex gap-2">
            {state.sessionStatus === "LOBBY" && (
              <>
                <button
                  type="button"
                  onClick={() => runAction(state.lobbyLocked ? "UNLOCK_LOBBY" : "LOCK_LOBBY")}
                  className="rounded-lg border border-borda bg-white px-4 py-2.5 text-sm font-semibold text-texto transition hover:bg-cinza-calido"
                >
                  {state.lobbyLocked ? "Entrada bloqueada" : "Bloquear entrada"}
                </button>
                <button
                  type="button"
                  onClick={() => runAction("START")}
                  className="rounded-lg bg-azul-tecnico px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90"
                >
                  Iniciar investigação
                </button>
              </>
            )}
            {state.sessionStatus === "ACTIVE" && (
              <button
                type="button"
                onClick={() => runAction("CLOSE")}
                className="rounded-lg border border-alert-500/40 bg-alert-500/10 px-4 py-2.5 text-sm font-semibold text-alert-500 transition hover:bg-alert-500/20"
              >
                Encerrar sala
              </button>
            )}
          </div>
        </div>

        {error && <p className="rounded-lg border border-ambar/40 bg-ambar/10 px-4 py-2 text-sm text-texto">{error}</p>}

        {state.sessionStatus === "LOBBY" && (
          <div className="flex flex-col items-center gap-4 rounded-card border border-borda bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left">
            <GenesisQRCode url={joinUrl} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Convide a turma</p>
              <p className="text-2xl font-black text-azul-institucional">Código {state.code}</p>
              <p className="mt-1 text-sm text-texto-secundario">{joinUrl}</p>
              <p className="mt-3 text-xs text-texto-secundario">
                Os alunos entram pela própria sala — a investigação começa quando você clicar em &quot;Iniciar
                investigação&quot;.
              </p>
            </div>
          </div>
        )}

        {state.sessionStatus === "CLOSED" && (
          <div className="rounded-card border border-borda bg-white p-4 text-sm text-texto-secundario shadow-sm">
            Esta sala foi encerrada. Os números abaixo são o retrato final da turma.
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-texto">Acerto por aluno e por etapa</p>
          <ProfessorStudentsTable state={state} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-texto">Pontos de atenção</p>
          <AttentionPointsPanel state={state} />
        </div>
      </div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-off-white p-6 font-jakarta">
      <div className="max-w-sm rounded-card border border-borda bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-texto">{title}</p>
        {body && <p className="mt-2 text-sm text-texto-secundario">{body}</p>}
      </div>
    </main>
  );
}
