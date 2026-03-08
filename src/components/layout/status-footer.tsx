import { ModelSelector } from "./model-selector";
import { ProjectSwitcher } from "./project-switcher";
import type { ProjectSummary } from "../../types/project-types";

interface StatusFooterProps {
  activeFile: string | null;
  cursorLine?: number;
  cursorCol?: number;
  gitBranch: string | null;
  diagnosticCount?: number;
  claudeAvailable: boolean;
  model: string;
  onModelChange: (model: string) => void;
  contextPercent: number;
  projects: ProjectSummary[];
  currentProjectId: string | null;
  onSwitchProject: (id: string) => void;
}

function getLanguage(path: string | null): string {
  if (!path) return "";
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TSX", js: "JavaScript", jsx: "JSX",
    rs: "Rust", py: "Python", go: "Go", md: "Markdown",
    json: "JSON", toml: "TOML", yaml: "YAML", yml: "YAML",
    css: "CSS", html: "HTML", svg: "SVG", sh: "Shell",
    sql: "SQL", swift: "Swift", kt: "Kotlin", java: "Java",
    c: "C", cpp: "C++", h: "C Header", rb: "Ruby",
  };
  return map[ext ?? ""] ?? ext?.toUpperCase() ?? "";
}

export function StatusFooter({
  activeFile, cursorLine, cursorCol, gitBranch, diagnosticCount = 0, claudeAvailable,
  model, onModelChange, contextPercent, projects, currentProjectId, onSwitchProject,
}: StatusFooterProps) {
  const lang = getLanguage(activeFile);
  const clampedPercent = Math.max(0, Math.min(100, contextPercent));

  return (
    <div className="flex items-center px-4 h-[22px] border-t border-border/30 text-[11px] text-zinc-600 shrink-0 gap-4">
      <ProjectSwitcher projects={projects} currentProjectId={currentProjectId} onSwitch={onSwitchProject} />
      {gitBranch && (
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px]">{"\u2387"}</span>
          <span>{gitBranch}</span>
        </span>
      )}
      {diagnosticCount > 0 && (
        <span className="text-amber-500/70 shrink-0">{diagnosticCount} diagnostic{diagnosticCount !== 1 ? "s" : ""}</span>
      )}
      {/* Context usage bar */}
      <div className="flex-1 flex items-center gap-1.5" title={`${clampedPercent}% context used`}>
        <span className="text-[10px] text-zinc-700 shrink-0">ctx</span>
        <div className="flex-1 h-[4px] bg-zinc-800/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              clampedPercent > 80 ? "bg-amber-500/70" : "bg-cyan-500/50"
            }`}
            style={{ width: `${Math.max(clampedPercent, 2)}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-700 shrink-0">{clampedPercent}%</span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {cursorLine != null && cursorCol != null && (
          <span>Ln {cursorLine}, Col {cursorCol}</span>
        )}
        {lang && <span>{lang}</span>}
        <ModelSelector model={model} onSelect={onModelChange} />
        <span className={`w-1.5 h-1.5 rounded-full ${claudeAvailable ? "bg-sky-400/60" : "bg-zinc-700/60"}`} />
      </div>
    </div>
  );
}
