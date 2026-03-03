import { LiminalLogo } from "../shared/liminal-logo";
import { CollabIndicator } from "./collab-indicator";
import { ModelSelector } from "./model-selector";
import { ProjectSwitcher } from "./project-switcher";
import type { CollabStatus } from "../../types/collab-types";
import type { ProjectSummary } from "../../types/project-types";

interface StatusBarProps {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  claudeAvailable: boolean;
  fileTreeOpen: boolean;
  gitBranch: string | null;
  model: string;
  collabStatus: CollabStatus;
  onToggleFileTree: () => void;
  onGoHome: () => void;
  onSwitchProject: (id: string) => void;
  onModelChange: (model: string) => void;
  onToggleSettings: () => void;
  onToggleTutorial: () => void;
  onCollabShare: () => void;
  onCollabLeave: () => void;
}

export function StatusBar({
  projects, currentProjectId, claudeAvailable, fileTreeOpen, gitBranch, model,
  collabStatus, onToggleFileTree, onGoHome, onSwitchProject, onModelChange, onToggleSettings, onToggleTutorial,
  onCollabShare, onCollabLeave,
}: StatusBarProps) {
  const statusDot = claudeAvailable ? "\u25cf" : "\u25cb";
  const statusColor = claudeAvailable ? "text-emerald-400" : "text-zinc-600";

  return (
    <div data-tauri-drag-region data-tutorial="status-bar"
      className="flex items-center justify-between pl-[78px] pr-4 py-2.5 border-b border-zinc-800/50">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleFileTree}
          title="files"
          className={`text-[20px] leading-none transition-colors ${
            fileTreeOpen ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          {"\u2261"}
        </button>
        <button onClick={onGoHome} title="home" className="opacity-80 hover:opacity-100 transition-opacity">
          <LiminalLogo size={26} />
        </button>
        <ProjectSwitcher projects={projects} currentProjectId={currentProjectId} onSwitch={onSwitchProject} />
        {gitBranch && (
          <span className="text-[13px] text-zinc-600">{gitBranch}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <CollabIndicator status={collabStatus} onShare={onCollabShare} onLeave={onCollabLeave} />
        <div className="flex items-center gap-2">
          <span className={`text-[11px] ${statusColor}`}>{statusDot}</span>
          <ModelSelector model={model} onSelect={onModelChange} />
        </div>
        <div className="flex items-center gap-2 border-l border-zinc-800/50 pl-4">
          <button
            onClick={onToggleTutorial}
            title="tutorial"
            className="px-2 py-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            help
          </button>
          <button
            onClick={onToggleSettings}
            title="settings"
            className="px-2 py-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            config
          </button>
        </div>
      </div>
    </div>
  );
}
