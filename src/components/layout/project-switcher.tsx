import { useState, useRef, useEffect } from "react";
import type { ProjectSummary } from "../../types/project-types";

interface ProjectSwitcherProps {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  onSwitch: (id: string) => void;
}

function groupByWorkspace(projects: ProjectSummary[]): [string | null, ProjectSummary[]][] {
  const groups = new Map<string | null, ProjectSummary[]>();
  for (const p of projects) {
    const ws = p.workspace ?? null;
    const list = groups.get(ws) ?? [];
    list.push(p);
    groups.set(ws, list);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });
}

export function ProjectSwitcher({ projects, currentProjectId, onSwitch }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const shortenPath = (path: string) =>
    path.replace(/^[A-Z]:\\Users\\[^\\]+/i, "~").replace(/^\/Users\/[^/]+/, "~");
  const label = current?.name ?? "no project";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors text-[11px] tracking-wide"
      >
        <span>{label}</span>
        {projects.length > 0 && (
          <span className="text-[9px] text-zinc-600">{open ? "▴" : "▾"}</span>
        )}
      </button>
      {open && projects.length > 0 && (
        <div className="absolute left-0 bottom-full mb-2 border border-panel-border bg-popover rounded-[3px] shadow-2xl shadow-black/70 z-50 min-w-[220px] max-h-[300px] overflow-y-auto py-1.5">
          {groupByWorkspace(projects).map(([ws, items]) => (
            <div key={ws ?? "__none"}>
              {ws && (
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest px-4 pt-3 pb-1">
                  {ws}
                </div>
              )}
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onSwitch(p.id); setOpen(false); }}
                  className={`flex items-center justify-between w-full text-left px-4 py-2 text-[12px] tracking-wide transition-colors ${
                    p.id === currentProjectId
                      ? "text-zinc-200 bg-accent/50"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-accent/30"
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-zinc-700 text-[11px] truncate ml-4">{shortenPath(p.root_path)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
