import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProjectSummary } from "../../types/project-types";
import { LiminalLogo } from "../shared/liminal-logo";

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
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-8 py-8">
      <div className="flex flex-col items-center gap-3">
        <LiminalLogo size={48} className="opacity-30" />
        <span className="text-zinc-600 text-[11px] tracking-widest uppercase">liminal</span>
      </div>

      {projects.length > 0 && (
        <div className="w-full max-w-72 px-4">
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 px-1">recent</div>
          <div className="flex flex-col">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onCommand("open", p.root_path)}
                className="flex items-center justify-between px-2 py-1.5 text-[12px] hover:bg-zinc-900/50 transition-colors text-left"
              >
                <span className="text-zinc-400">{p.name}</span>
                <span className="text-zinc-700 truncate ml-4 text-[11px]">{shortenPath(p.root_path)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {input ? (
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 text-[11px]">/{input.mode}</span>
            <input
              autoFocus
              value={input.value}
              onChange={(e) => setInput({ ...input, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitInput();
                if (e.key === "Escape") setInput(null);
              }}
              className="bg-transparent border-b border-zinc-700 text-zinc-300 text-[12px] px-1 py-0.5 outline-none w-48 focus:border-zinc-500"
              placeholder={input.mode === "new" ? "project name" : "path to project"}
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setInput({ mode: "new", value: "" })}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              /new
            </button>
            <span className="text-zinc-800 text-[10px]">/</span>
            <button
              onClick={onTutorial}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              /tutorial
            </button>
            <span className="text-zinc-800 text-[10px]">/</span>
            <button
              onClick={() => setInput({ mode: "open", value: "" })}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              /open
            </button>
          </>
        )}
      </div>
    </div>
  );
}
