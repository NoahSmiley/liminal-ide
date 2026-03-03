import { LiminalLogo } from "../shared/liminal-logo";
import { CollabIndicator } from "./collab-indicator";
import type { CollabStatus } from "../../types/collab-types";

interface StatusBarProps {
  projectName: string | null;
  claudeAvailable: boolean;
  fileTreeOpen: boolean;
  gitBranch: string | null;
  collabStatus: CollabStatus;
  onToggleFileTree: () => void;
  onToggleSettings: () => void;
  onToggleTutorial: () => void;
  onCollabShare: () => void;
  onCollabLeave: () => void;
}

export function StatusBar({
  projectName, claudeAvailable, fileTreeOpen, gitBranch,
  collabStatus, onToggleFileTree, onToggleSettings, onToggleTutorial,
  onCollabShare, onCollabLeave,
}: StatusBarProps) {
  const path = projectName ? `~/${projectName}` : "~";
  const status = claudeAvailable ? "\u25cf" : "\u25cb";
  const statusColor = claudeAvailable ? "text-emerald-500" : "text-zinc-700";

  return (
    <div data-tutorial="status-bar" className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/40 text-[11px]">
      <span className="flex items-center gap-2 text-zinc-500">
        <button
          onClick={onToggleFileTree}
          title="files (\u2318B)"
          className={`text-[12px] leading-none transition-colors ${
            fileTreeOpen ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          \u2261
        </button>
        <LiminalLogo size={12} className="opacity-40" />
        <span className="text-zinc-500">{path}</span>
        {gitBranch && (
          <span className="text-zinc-600 text-[10px]">{gitBranch}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <CollabIndicator status={collabStatus} onShare={onCollabShare} onLeave={onCollabLeave} />
        <span className={`text-[8px] ${statusColor}`}>{status}</span>
        <span className="text-zinc-600">claude</span>
        <button
          onClick={onToggleTutorial}
          title="tutorial"
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          ?
        </button>
        <button
          onClick={onToggleSettings}
          title="settings (\u2318,)"
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          *
        </button>
      </span>
    </div>
  );
}
