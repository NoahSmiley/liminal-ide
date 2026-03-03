import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProjectSummary } from "../../types/project-types";
import { LiminalLogo } from "../shared/liminal-logo";

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

interface WelcomeScreenProps {
  onCommand: (cmd: string, args: string) => void;
  onTutorial: () => void;
}

export function WelcomeScreen({ onCommand, onTutorial }: WelcomeScreenProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [input, setInput] = useState<{ mode: "new" | "open"; value: string } | null>(null);

  useEffect(() => {
    invoke<ProjectSummary[]>("list_projects")
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const submitInput = () => {
    if (!input?.value.trim()) return;
    onCommand(input.mode, input.value.trim());
    setInput(null);
  };

  const shortenPath = (path: string) => path.replace(/^\/Users\/[^/]+/, "~");

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-10 py-12">
      <div className="flex flex-col items-center gap-4">
        <LiminalLogo size={64} className="opacity-40" />
        <span className="text-zinc-600 text-[13px] tracking-[0.25em] uppercase font-medium">
          liminal
        </span>
      </div>

      {projects.length > 0 && (
        <div className="w-full max-w-sm">
          <div className="text-[12px] text-zinc-600 uppercase tracking-wider mb-3 px-2">
            recent projects
          </div>
          <div className="flex flex-col gap-0.5">
            {groupByWorkspace(projects).map(([ws, items]) => (
              <div key={ws ?? "__none"}>
                {ws && <div className="text-[11px] text-zinc-700 uppercase tracking-wider px-3 pt-2 pb-1">{ws}</div>}
                {items.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onCommand("open", p.root_path)}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-zinc-900/60 transition-colors text-left border border-transparent hover:border-zinc-800/50 w-full"
                  >
                    <span className="text-zinc-300">{p.name}</span>
                    <span className="text-zinc-700 truncate ml-6 text-[13px]">
                      {shortenPath(p.root_path)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {input ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-[13px]">/{input.mode}</span>
            <input
              autoFocus
              value={input.value}
              onChange={(e) => setInput({ ...input, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitInput();
                if (e.key === "Escape") setInput(null);
              }}
              className="bg-transparent border-b border-zinc-700 text-zinc-300 px-1 py-1 outline-none w-56 focus:border-zinc-500"
              placeholder={input.mode === "new" ? "project name" : "path to project"}
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setInput({ mode: "new", value: "" })}
              className="text-[14px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              /new
            </button>
            <span className="text-zinc-800">/</span>
            <button
              onClick={onTutorial}
              className="text-[14px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              /tutorial
            </button>
            <span className="text-zinc-800">/</span>
            <button
              onClick={() => setInput({ mode: "open", value: "" })}
              className="text-[14px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              /open
            </button>
          </>
        )}
      </div>
    </div>
  );
}
