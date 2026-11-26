"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type {
  EvidenceDTO,
  MyScenarioResponseDTO,
  ScenarioDTO,
  ScenarioItemAnswerDTO,
} from "@/types/realtime";

const SUPERVISOR_OPTIONS = ["Banco Central do Brasil (BCB)", "CVM", "SUSEP", "PREVIC", "Não sei ainda"];

interface RowState {
  responsavel: string;
  tipo: string;
  supervisor: string;
  evidenceKey: string;
  markedInsufficient: boolean;
  justification: string;
}

function emptyRow(): RowState {
  return { responsavel: "", tipo: "", supervisor: "", evidenceKey: "", markedInsufficient: false, justification: "" };
}

export function ScenarioDossier({
  scenario,
  evidences,
  responses,
  revealed,
  revealedAnswers,
  onRespond,
  disabled,
}: {
  scenario: ScenarioDTO;
  evidences: EvidenceDTO[];
  responses: MyScenarioResponseDTO[];
  revealed: boolean;
  revealedAnswers?: Record<string, ScenarioItemAnswerDTO> | null;
  onRespond: (scenarioItemId: string, patch: Partial<RowState>) => void;
  disabled?: boolean;
}) {
  const responseByItem = new Map(responses.map((r) => [r.scenarioItemId, r]));
  const [drafts, setDrafts] = useState<Record<string, RowState>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const item of scenario.items) {
        if (next[item.id]) continue;
        const saved = responseByItem.get(item.id);
        next[item.id] = saved
          ? {
              responsavel: saved.responsavel,
              tipo: saved.tipo,
              supervisor: saved.supervisor,
              evidenceKey: saved.evidenceKey ?? "",
              markedInsufficient: saved.markedInsufficient,
              justification: saved.justification,
            }
          : emptyRow();
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.items.length, responses.length]);

  function patch(itemId: string, fields: Partial<RowState>, commit = true) {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? emptyRow()), ...fields } }));
    if (commit) onRespond(itemId, fields);
  }

  return (
    <div className="space-y-4">
      <div className="dossier-card p-4">
        <p className="label-eyebrow mb-1">{scenario.title}</p>
        <p className="text-sm text-ink-700">{scenario.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {scenario.documents.map((doc) => (
          <div key={doc.id} className="dossier-card p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-700">{doc.title}</p>
            <p className="mt-1 text-sm text-ink-700">{doc.text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {scenario.items.map((item) => {
          const draft = drafts[item.id] ?? emptyRow();
          const answer = revealedAnswers?.[item.id];
          return (
            <div key={item.id} className="dossier-card p-4">
              <p className="font-display text-base font-bold text-ink-900">{item.service}</p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="text-xs font-semibold text-ink-700">
                  Responsável provável
                  <input
                    className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-navy-600"
                    value={draft.responsavel}
                    disabled={disabled || draft.markedInsufficient}
                    onChange={(e) => patch(item.id, { responsavel: e.target.value }, false)}
                    onBlur={(e) => patch(item.id, { responsavel: e.target.value })}
                    placeholder="Ex.: Aurora Crédito SCD S.A."
                  />
                </label>
                <label className="text-xs font-semibold text-ink-700">
                  Tipo de instituição
                  <input
                    className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-navy-600"
                    value={draft.tipo}
                    disabled={disabled || draft.markedInsufficient}
                    onChange={(e) => patch(item.id, { tipo: e.target.value }, false)}
                    onBlur={(e) => patch(item.id, { tipo: e.target.value })}
                    placeholder="Ex.: SCD"
                  />
                </label>
                <label className="text-xs font-semibold text-ink-700">
                  Supervisor relacionado
                  <select
                    className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-navy-600"
                    value={draft.supervisor}
                    disabled={disabled || draft.markedInsufficient}
                    onChange={(e) => patch(item.id, { supervisor: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {SUPERVISOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-700">
                  Evidência que comprova
                  <select
                    className="mt-1 w-full rounded-md border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-navy-600"
                    value={draft.evidenceKey}
                    disabled={disabled || draft.markedInsufficient}
                    onChange={(e) => patch(item.id, { evidenceKey: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {evidences.map((ev) => (
                      <option key={ev.key} value={ev.key}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-700">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={draft.markedInsufficient}
                  onChange={(e) => patch(item.id, { markedInsufficient: e.target.checked })}
                />
                Não existem informações suficientes para concluir
              </label>

              {draft.markedInsufficient && (
                <textarea
                  className="mt-2 w-full rounded-md border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-navy-600"
                  rows={2}
                  disabled={disabled}
                  placeholder='Ex.: "Preciso identificar qual CNPJ concede o crédito."'
                  value={draft.justification}
                  onChange={(e) => patch(item.id, { justification: e.target.value }, false)}
                  onBlur={(e) => patch(item.id, { justification: e.target.value })}
                />
              )}

              {revealed && answer && (
                <div className="mt-3 space-y-1 rounded-md bg-info-500/10 px-2.5 py-2 text-xs leading-snug text-navy-800">
                  <p>
                    <strong>Leitura do dossiê — responsável:</strong> {answer.responsavel}
                  </p>
                  <p>
                    <strong>Tipo:</strong> {answer.tipo}
                  </p>
                  <p>
                    <strong>Supervisor:</strong> {answer.supervisor}
                  </p>
                  {answer.evidenceTitle && (
                    <p>
                      <strong>Evidência-chave:</strong> {answer.evidenceTitle}
                    </p>
                  )}
                  {answer.insufficientIsValid && (
                    <p className="italic text-navy-700">
                      Esta peça foi propositalmente subdocumentada — &ldquo;informação insuficiente&rdquo; também é
                      uma conclusão defensável aqui.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
