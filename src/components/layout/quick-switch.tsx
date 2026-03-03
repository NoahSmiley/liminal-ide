import { useState, useRef, useEffect, useCallback } from "react";
import type { ProjectSummary } from "../../types/project-types";

interface QuickSwitchProps {
  projects: ProjectSummary[];
  onSwitch: (id: string) => void;
  onClose: () => void;
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

export function QuickSwitch({ projects, onSwitch, onClose }: QuickSwitchProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = projects.filter((p) => {
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.root_path.toLowerCase().includes(q);
  });

  const flatList = groupByWorkspace(filtered).flatMap(([, items]) => items);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback((id: string) => {
    onSwitch(id);
    onClose();
  }, [onSwitch, onClose]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, flatList.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && flatList[selectedIdx]) { handleSelect(flatList[selectedIdx].id); }
  }, [flatList, selectedIdx, onClose, handleSelect]);

  const shortenPath = (path: string) =>
    path.replace(/^[A-Z]:\\Users\\[^\\]+/i, "~").replace(/^\/Users\/[^/]+/, "~");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 px-3 py-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent text-zinc-200 outline-none placeholder-zinc-700"
            placeholder="switch project..."
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {groupByWorkspace(filtered).map(([ws, items]) => (
            <div key={ws ?? "__none"}>
              {ws && (
                <div className="text-[10px] text-zinc-700 uppercase tracking-wider px-3 pt-2 pb-1">{ws}</div>
              )}
              {items.map((p) => {
                const idx = flatList.indexOf(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-[13px] transition-colors ${
                      idx === selectedIdx ? "bg-zinc-800/60 text-zinc-200" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-zinc-700 truncate ml-4 text-[12px]">{shortenPath(p.root_path)}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {flatList.length === 0 && (
            <div className="px-3 py-4 text-zinc-700 text-[13px]">no projects found</div>
          )}
        </div>
      </div>
    </div>
  );
}
