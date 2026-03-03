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
    <div className="border-b border-zinc-800/30 last:border-0">
      <div className="flex items-center gap-2 px-2 py-1 text-[10px]">
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="text-zinc-600 hover:text-zinc-400 shrink-0"
        >
          {showDiff ? "v" : ">"}
        </button>
        <span className="text-zinc-400 truncate flex-1">{change.path}</span>
        <span className="text-zinc-600 shrink-0">{change.change_type}</span>
        {isResolved ? (
          <span className={change.status === "accepted" ? "text-emerald-600" : "text-red-600"}>
            {change.status}
          </span>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onAccept} className="text-emerald-500 hover:text-emerald-400">
              accept
            </button>
            <button onClick={onReject} className="text-red-500 hover:text-red-400">
              reject
            </button>
          </div>
        )}
      </div>
      {showDiff && (
        <div className="px-2 pb-1">
          <InlineDiff path={change.path} before={change.before} after={change.after} />
        </div>
      )}
    </div>
  );
}
