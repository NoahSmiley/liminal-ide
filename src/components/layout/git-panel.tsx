import { useState, useEffect, useCallback } from "react";
import { TuiPanel } from "../shared/tui-panel";
import { GitStatusList } from "./git-status-list";
import { GitCommitList } from "./git-commit-list";
import { GitDiffViewer } from "./git-diff-viewer";
import { useGit } from "../../hooks/use-git";

type GitTab = "status" | "log" | "diff";

const TABS: GitTab[] = ["status", "log", "diff"];

interface GitPanelProps {
  onSelectFile?: (path: string) => void;
  onClose: () => void;
}

export function GitPanel({ onSelectFile, onClose }: GitPanelProps) {
  const [activeTab, setActiveTab] = useState<GitTab>("status");
  const { status, commits, diffs, loading, refreshAll } = useGit();

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleSelectFile = useCallback(
    (path: string) => {
      onSelectFile?.(path);
    },
    [onSelectFile],
  );

  return (
    <TuiPanel
      title="git"
      className="mx-3 mb-2 max-h-[50vh] flex flex-col"
      dataTutorial="git-panel"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="text-zinc-600 hover:text-zinc-400 text-[10px]"
            disabled={loading}
          >
            {loading ? "..." : "refresh"}
          </button>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-[11px]"
          >
            esc
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-1 mb-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] px-2 py-0.5 uppercase tracking-wider ${
              activeTab === tab
                ? "text-cyan-400 border-b border-cyan-400"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {tab}
          </button>
        ))}
        {status && (
          <span className="text-[10px] text-zinc-600 ml-auto">
            {status.branch}
            {(status.ahead > 0 || status.behind > 0) && (
              <span className="ml-1 text-zinc-700">
                {status.ahead > 0 && `+${status.ahead}`}
                {status.behind > 0 && `-${status.behind}`}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "status" && status && (
          <GitStatusList status={status} onSelectFile={handleSelectFile} />
        )}
        {activeTab === "status" && !status && !loading && (
          <div className="text-[10px] text-zinc-600">no status available</div>
        )}
        {activeTab === "log" && <GitCommitList commits={commits} />}
        {activeTab === "diff" && <GitDiffViewer diffs={diffs} />}
      </div>
    </TuiPanel>
  );
}
