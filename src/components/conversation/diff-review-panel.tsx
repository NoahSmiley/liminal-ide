import { DiffHunk } from "./diff-hunk";
import type { StagedTurn } from "../../types/diff-types";

interface DiffReviewPanelProps {
  staged: StagedTurn;
  onAcceptFile: (path: string) => void;
  onRejectFile: (path: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function DiffReviewPanel({
  staged, onAcceptFile, onRejectFile, onAcceptAll, onRejectAll,
}: DiffReviewPanelProps) {
  if (staged.files.length === 0) return null;

  return (
    <div className="border border-zinc-800 mx-3 mb-2">
      <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800 text-[10px]">
        <span className="text-zinc-500 uppercase tracking-wider">
          {staged.files.length} file{staged.files.length > 1 ? "s" : ""} changed
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onAcceptAll} className="text-sky-500 hover:text-sky-400">
            accept all
          </button>
          <button onClick={onRejectAll} className="text-red-500 hover:text-red-400">
            reject all
          </button>
        </div>
      </div>
      <div className="max-h-[40vh] overflow-y-auto">
        {staged.files.map((file) => (
          <div key={file.path} className="border-b border-zinc-800/50 last:border-0">
            <div className="flex items-center justify-between px-3 py-1 text-[10px]">
              <span className="text-zinc-400 truncate">{file.path}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onAcceptFile(file.path)}
                  className="text-sky-600 hover:text-sky-400"
                >
                  accept
                </button>
                <button
                  onClick={() => onRejectFile(file.path)}
                  className="text-red-600 hover:text-red-400"
                >
                  reject
                </button>
              </div>
            </div>
            {file.hunks.map((hunk, i) => (
              <DiffHunk key={i} hunk={hunk} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
