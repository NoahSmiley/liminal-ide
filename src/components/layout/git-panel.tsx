import { useState, useEffect, useCallback } from "react";
import { useGit } from "../../hooks/use-git";
import type { GitStatus, StatusEntry, GitCommit, GitFileDiff } from "../../types/git-types";

type GitTab = "status" | "log" | "diff";

interface GitPanelProps {
  onSelectFile?: (path: string) => void;
}

// ─── Status entry row ────────────────────────────────────────────────────────

function statusColor(s: string): string {
  if (s === "M") return "text-amber-400";
  if (s === "A") return "text-green-400";
  if (s === "D") return "text-red-400";
  if (s === "R") return "text-cyan-400";
  return "text-zinc-500";
}

function StatusRow({
  entry,
  onSelect,
}: {
  entry: StatusEntry;
  onSelect: (path: string) => void;
}) {
  const name = entry.path.split("/").pop() ?? entry.path;
  const dir = entry.path.includes("/")
    ? entry.path.slice(0, entry.path.lastIndexOf("/"))
    : "";

  return (
    <button
      onClick={() => onSelect(entry.path)}
      className="flex items-center w-full text-left h-[22px] pl-6 pr-2 hover:bg-white/[0.04] group"
    >
      <span
        className={`text-[10px] font-mono w-3 shrink-0 mr-2 ${statusColor(entry.status)}`}
      >
        {entry.status}
      </span>
      <span className="text-[10px] text-zinc-300 truncate group-hover:text-white transition-colors">
        {name}
      </span>
      {dir && (
        <span className="text-[10px] text-zinc-600 ml-1 truncate flex-1 text-right">
          {dir}
        </span>
      )}
    </button>
  );
}

// ─── Collapsible section header ───────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center w-full h-[22px] px-2 hover:bg-white/[0.04] select-none group"
    >
      <span className="text-[10px] text-zinc-500 mr-1.5 w-2.5 shrink-0 leading-none">
        {collapsed ? "▸" : "▾"}
      </span>
      <span className="text-[10px] text-zinc-400 uppercase tracking-[0.1em] font-medium flex-1 text-left">
        {label}
      </span>
      <span className="text-[10px] text-zinc-600">{count}</span>
    </button>
  );
}

// ─── Status tab ──────────────────────────────────────────────────────────────

function StatusTab({
  status,
  onSelectFile,
}: {
  status: GitStatus;
  onSelectFile: (path: string) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasChanges =
    status.staged.length > 0 ||
    status.unstaged.length > 0 ||
    status.untracked.length > 0;

  if (!hasChanges) {
    return (
      <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
        working tree clean
      </div>
    );
  }

  return (
    <div>
      {status.staged.length > 0 && (
        <>
          <SectionHeader
            label="staged"
            count={status.staged.length}
            collapsed={!!collapsedSections["staged"]}
            onToggle={() => toggle("staged")}
          />
          {!collapsedSections["staged"] &&
            status.staged.map((e) => (
              <StatusRow key={e.path} entry={e} onSelect={onSelectFile} />
            ))}
        </>
      )}
      {status.unstaged.length > 0 && (
        <>
          <SectionHeader
            label="changes"
            count={status.unstaged.length}
            collapsed={!!collapsedSections["unstaged"]}
            onToggle={() => toggle("unstaged")}
          />
          {!collapsedSections["unstaged"] &&
            status.unstaged.map((e) => (
              <StatusRow key={e.path} entry={e} onSelect={onSelectFile} />
            ))}
        </>
      )}
      {status.untracked.length > 0 && (
        <>
          <SectionHeader
            label="untracked"
            count={status.untracked.length}
            collapsed={!!collapsedSections["untracked"]}
            onToggle={() => toggle("untracked")}
          />
          {!collapsedSections["untracked"] &&
            status.untracked.map((e) => (
              <StatusRow key={e.path} entry={e} onSelect={onSelectFile} />
            ))}
        </>
      )}
    </div>
  );
}

// ─── Log tab ─────────────────────────────────────────────────────────────────

function LogTab({ commits }: { commits: GitCommit[] }) {
  if (commits.length === 0) {
    return (
      <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
        no commits
      </div>
    );
  }

  return (
    <div>
      {commits.map((commit) => (
        <div
          key={commit.id}
          className="flex items-baseline h-[22px] px-2 hover:bg-white/[0.04] group"
        >
          <span className="text-[10px] text-cyan-700 font-mono shrink-0 w-[3.5rem] tabular-nums">
            {commit.id.slice(0, 7)}
          </span>
          <span className="text-[10px] text-zinc-400 truncate flex-1 group-hover:text-zinc-200 transition-colors">
            {commit.message}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Diff tab ─────────────────────────────────────────────────────────────────

function DiffEntry({ diff }: { diff: GitFileDiff }) {
  const [expanded, setExpanded] = useState(false);
  const name = diff.path.split("/").pop() ?? diff.path;

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center w-full text-left h-[22px] px-2 hover:bg-white/[0.04] group"
      >
        <span className="text-[10px] text-zinc-500 mr-1.5 w-2.5 shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="text-[10px] text-zinc-300 truncate flex-1">{name}</span>
        <span className="text-[10px] text-green-500 shrink-0 ml-1">+{diff.additions}</span>
        <span className="text-[10px] text-red-500 shrink-0 ml-0.5">-{diff.deletions}</span>
      </button>
      {expanded && (
        <pre className="text-[10px] leading-[1.5] px-3 py-1 overflow-x-auto bg-zinc-950/60 border-y border-zinc-800/30">
          {diff.patch.split("\n").map((line, i) => {
            let color = "text-zinc-500";
            if (line.startsWith("+")) color = "text-green-500";
            else if (line.startsWith("-")) color = "text-red-500";
            else if (line.startsWith("@@")) color = "text-cyan-700";
            return (
              <div key={i} className={color}>
                {line || "\u00a0"}
              </div>
            );
          })}
        </pre>
      )}
    </div>
  );
}

function DiffTab({ diffs }: { diffs: GitFileDiff[] }) {
  if (diffs.length === 0) {
    return (
      <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
        no diffs
      </div>
    );
  }

  return (
    <div>
      {diffs.map((diff) => (
        <DiffEntry key={diff.path} diff={diff} />
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const TABS: GitTab[] = ["status", "log", "diff"];

export function GitPanel({ onSelectFile }: GitPanelProps) {
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
    <div className="flex flex-col h-full" data-tutorial="git-panel">
      {/* Tab bar + branch + refresh */}
      <div className="flex items-center h-[30px] px-2 border-b border-zinc-800/50 shrink-0 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-full px-1.5 text-[10px] uppercase tracking-[0.1em] border-b-2 transition-colors ${
              activeTab === tab
                ? "border-cyan-500 text-zinc-200"
                : "border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        {status && (
          <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[5rem]" title={status.branch}>
            {status.branch}
          </span>
        )}
        <button
          onClick={refreshAll}
          disabled={loading}
          title="refresh"
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] disabled:opacity-40 transition-colors ml-0.5 text-[11px]"
        >
          {loading ? "·" : "↻"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "status" && status && (
          <StatusTab status={status} onSelectFile={handleSelectFile} />
        )}
        {activeTab === "status" && !status && !loading && (
          <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
            no repository
          </div>
        )}
        {activeTab === "log" && <LogTab commits={commits} />}
        {activeTab === "diff" && <DiffTab diffs={diffs} />}
      </div>
    </div>
  );
}
