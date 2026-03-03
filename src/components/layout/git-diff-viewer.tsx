import { useState } from "react";
import type { GitFileDiff } from "../../types/git-types";

interface GitDiffViewerProps {
  diffs: GitFileDiff[];
}

function DiffEntry({ diff }: { diff: GitFileDiff }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 w-full text-left px-1 py-0.5 hover:bg-zinc-900/50"
      >
        <span className="text-[10px] text-zinc-600">{expanded ? "v" : ">"}</span>
        <span className="text-[11px] text-zinc-400 truncate flex-1">{diff.path}</span>
        <span className="text-[10px] text-green-600 shrink-0">+{diff.additions}</span>
        <span className="text-[10px] text-red-600 shrink-0">-{diff.deletions}</span>
      </button>
      {expanded && (
        <pre className="text-[10px] leading-tight px-2 py-1 overflow-x-auto bg-zinc-950 border border-zinc-800/40 mt-0.5">
          {diff.patch.split("\n").map((line, i) => {
            let color = "text-zinc-500";
            if (line.startsWith("+")) color = "text-green-600";
            else if (line.startsWith("-")) color = "text-red-600";
            else if (line.startsWith("@@")) color = "text-cyan-800";
            return (
              <div key={i} className={color}>
                {line}
              </div>
            );
          })}
        </pre>
      )}
    </div>
  );
}

export function GitDiffViewer({ diffs }: GitDiffViewerProps) {
  if (diffs.length === 0) {
    return <div className="text-[10px] text-zinc-600">no diffs</div>;
  }

  return (
    <div className="overflow-y-auto">
      {diffs.map((diff) => (
        <DiffEntry key={diff.path} diff={diff} />
      ))}
    </div>
  );
}
