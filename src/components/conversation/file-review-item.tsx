import { useState } from "react";
import type { FileChange } from "../../types/change-types";
import { InlineDiff } from "./inline-diff";

interface FileReviewItemProps {
  change: FileChange;
  onAccept: () => void;
  onReject: () => void;
}

export function FileReviewItem({ change, onAccept, onReject }: FileReviewItemProps) {
  const [showDiff, setShowDiff] = useState(false);
  const isResolved = change.status !== "pending";

  return (
    <div className="border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 px-3 py-2 text-[12px]">
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="text-zinc-600 hover:text-zinc-400 shrink-0 text-[10px] transition-colors"
        >
          {showDiff ? "▾" : "▸"}
        </button>
        <span className="text-zinc-400 truncate flex-1 tracking-wide">{change.path}</span>
        <span className="text-zinc-600 shrink-0 uppercase tracking-widest text-[10px]">{change.change_type}</span>
        {isResolved ? (
          <span className={`text-[11px] ${change.status === "accepted" ? "text-sky-600" : "text-red-600"}`}>
            {change.status}
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onAccept} className="text-sky-500 hover:text-sky-400 text-[11px] transition-colors">
              accept
            </button>
            <button onClick={onReject} className="text-red-500 hover:text-red-400 text-[11px] transition-colors">
              reject
            </button>
          </div>
        )}
      </div>
      {showDiff && (
        <div className="px-3 pb-2">
          <InlineDiff path={change.path} before={change.before} after={change.after} />
        </div>
      )}
    </div>
  );
}
