import clsx from "clsx";

export interface StageNavItem {
  key: string;
  order: number;
  title: string;
  locked: boolean;
  completed: boolean;
}

export function StageSidebarNav({
  stages,
  activeKey,
  onSelect,
}: {
  stages: StageNavItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">Etapas</p>
      {stages.map((stage) => {
        const isActive = stage.key === activeKey;
        const label = stage.title.replace(/^Etapa\s+\d+\s*[—-]\s*/i, "");
        return (
          <button
            key={stage.key}
            type="button"
            disabled={stage.locked}
            onClick={() => onSelect(stage.key)}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
              isActive && "bg-white/10 font-semibold text-white",
              !isActive && !stage.locked && "text-white/75 hover:bg-white/5",
              stage.locked && "cursor-not-allowed text-white/35",
            )}
          >
            <StageStatusIcon completed={stage.completed} locked={stage.locked} active={isActive} />
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide text-white/40">Etapa {stage.order}</span>
              <span className="block truncate">{label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function StageStatusIcon({
  completed,
  locked,
  active,
}: {
  completed: boolean;
  locked: boolean;
  active: boolean;
}) {
  if (locked) {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-white/30" fill="none" aria-hidden>
        <rect x="4.5" y="9" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (completed) {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-ambar" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8" fill="currentColor" />
        <path d="M6.5 10.3l2.2 2.2 4.5-4.8" stroke="#0d2137" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className={clsx("h-5 w-5 shrink-0", active ? "text-ambar" : "text-white/40")} fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
