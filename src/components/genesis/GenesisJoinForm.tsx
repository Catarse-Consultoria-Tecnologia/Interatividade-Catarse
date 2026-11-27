"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenesisJoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) return;
    setSubmitting(true);
    router.push(`/genesis/sala/${trimmedCode}?name=${encodeURIComponent(trimmedName)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3 rounded-card border border-borda bg-white p-5 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">O trabalho ficou pela metade</p>
        <h2 className="text-xl font-bold text-texto">Entre na sua sala</h2>
      </div>

      <label className="block text-xs font-semibold text-texto-secundario">
        Código da sala
        <input
          className="mt-1 w-full rounded-lg border border-borda bg-white px-3 py-2 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] text-texto outline-none focus:border-azul-tecnico"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="OPE482"
          maxLength={8}
          autoComplete="off"
        />
      </label>

      <label className="block text-xs font-semibold text-texto-secundario">
        Seu nome
        <input
          className="mt-1 w-full rounded-lg border border-borda bg-white px-3 py-2 text-sm text-texto outline-none focus:border-azul-tecnico"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como devemos te chamar?"
          maxLength={40}
          autoComplete="off"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || !code.trim() || !name.trim()}
        className="w-full rounded-lg bg-azul-tecnico px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Entrar na sala
      </button>
      <p className="text-center text-[11px] text-texto-secundario/70">
        Sem cadastro. Não pedimos e-mail, senha ou credencial do Azure.
      </p>
    </form>
  );
}
