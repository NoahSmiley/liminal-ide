import { useState } from "react";
import type { FileChange } from "../../types/change-types";
import { FileReviewItem } from "./file-review-item";

interface TurnReviewBarProps {
  turnId: string;
  changes: FileChange[];
  onAcceptFile: (turnId: string, path: string) => void;
  onRejectFile: (turnId: string, path: string) => void;
  onAcceptAll: (turnId: string) => void;
  onRejectAll: (turnId: string) => void;
}

export function TurnReviewBar({
  turnId, changes, onAcceptFile, onRejectFile, onAcceptAll, onRejectAll,
}: TurnReviewBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (changes.length === 0) return null;

  const pendingCount = changes.filter((c) => c.status === "pending").length;
  const allResolved = pendingCount === 0;

  return (
    <div className="border border-zinc-800/40 bg-zinc-950/50 my-1 text-[11px]">
      <div className="flex items-center gap-3 px-2 py-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-600 hover:text-zinc-400"
        >
          {expanded ? "v" : ">"}
        </button>
        <span className="text-zinc-400">
          {changes.length} file{changes.length > 1 ? "s" : ""} changed
        </span>
        {allResolved ? (
          <span className="text-emerald-600 ml-auto">all resolved</span>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => onAcceptAll(turnId)}
              className="text-emerald-500 hover:text-emerald-400"
            >
              accept all
            </button>
            <button
              onClick={() => onRejectAll(turnId)}
              className="text-red-500 hover:text-red-400"
            >
              reject all
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="border-t border-zinc-800/40 max-h-[40vh] overflow-y-auto">
          {changes.map((change) => (
            <FileReviewItem
              key={change.path}
              change={change}
              onAccept={() => onAcceptFile(turnId, change.path)}
              onReject={() => onRejectFile(turnId, change.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
