import type { ReactNode } from "react";

// Identidade visual "Fechamento Mensal Folha" — usada só nas rotas /genesis/*.
// Não reaproveita nenhuma classe da identidade "sala de investigação" (dossier-card,
// cork-panel, btn-primary, etc.) dos jogos existentes.
export function GenesisShell({
  sidebar,
  eyebrow = "Operação Gênesis",
  title,
  headerRight,
  children,
}: {
  sidebar: ReactNode;
  eyebrow?: string;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-off-white font-jakarta text-texto">
      <div className="flex min-h-dvh flex-col sm:flex-row">
        <aside className="flex w-full flex-col gap-1 bg-azul-institucional px-4 py-4 text-white sm:w-64 sm:shrink-0 sm:overflow-y-auto sm:py-6">
          {sidebar}
        </aside>
        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-texto-secundario">{eyebrow}</p>
              <h1 className="text-lg font-bold text-texto sm:text-xl">{title}</h1>
            </div>
            {headerRight}
          </header>
          <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function GenesisCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-card border border-borda bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>
  );
}

export function GenesisPrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-azul-tecnico px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-azul-tecnico/90 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function GenesisSecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-borda bg-white px-4 py-2.5 text-sm font-semibold text-texto transition hover:bg-cinza-calido disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}
