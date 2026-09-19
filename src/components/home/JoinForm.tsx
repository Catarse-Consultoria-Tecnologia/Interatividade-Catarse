"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinForm() {
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
    router.push(`/sala/${trimmedCode}?name=${encodeURIComponent(trimmedName)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="dossier-card w-full max-w-sm space-y-3 p-5">
      <div>
        <p className="label-eyebrow">O sistema foi embaralhado</p>
        <h2 className="font-display text-xl font-bold text-ink-900">Sua missão é reconstruir o mapa.</h2>
      </div>

      <label className="block text-xs font-semibold text-ink-700">
        Código da sala
        <input
          className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] text-ink-900 outline-none focus:border-navy-600"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SFN482"
          maxLength={8}
          autoComplete="off"
        />
      </label>

      <label className="block text-xs font-semibold text-ink-700">
        Seu nome
        <input
          className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-navy-600"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como devemos te chamar?"
          maxLength={40}
          autoComplete="off"
        />
      </label>

      <button type="submit" disabled={submitting || !code.trim() || !name.trim()} className="btn-primary w-full">
        Entrar na investigação
      </button>
      <p className="text-center text-[11px] text-ink-700/50">
        Sem cadastro. Não pedimos e-mail, senha ou CPF.
      </p>
    </form>
  );
}
