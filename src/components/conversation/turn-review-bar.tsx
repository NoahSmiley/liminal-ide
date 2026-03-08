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
    <div className="border border-panel-border/70 bg-card/50 rounded-[3px] shadow-sm shadow-black/30 my-3 text-[12px]">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-600 hover:text-zinc-400 text-[10px] transition-colors"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className="text-zinc-400">
          {changes.length} file{changes.length > 1 ? "s" : ""} changed this turn
        </span>
        {allResolved ? (
          <span className="text-sky-600 ml-auto">all resolved</span>
        ) : (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => onAcceptAll(turnId)}
              className="text-sky-500 hover:text-sky-400 text-[11px] transition-colors"
            >
              accept all
            </button>
            <button
              onClick={() => onRejectAll(turnId)}
              className="text-red-500 hover:text-red-400 text-[11px] transition-colors"
            >
              reject all
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="border-t border-border/40 max-h-[40vh] overflow-y-auto">
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
