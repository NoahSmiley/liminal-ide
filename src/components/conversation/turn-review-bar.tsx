import type { FileChange } from "../../types/change-types";

interface TurnReviewBarProps {
  turnId: string;
  changes: FileChange[];
  accepted: boolean;
  onAccept: (turnId: string) => void;
  onRevert: (turnId: string) => void;
}

export function TurnReviewBar({ turnId, changes, accepted, onAccept, onRevert }: TurnReviewBarProps) {
  if (changes.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-2 py-1 text-[11px] border border-zinc-800/40 rounded bg-zinc-950/50 my-1">
      <span className="text-zinc-400">
        {changes.length} file{changes.length > 1 ? "s" : ""} changed
      </span>
      {accepted ? (
        <span className="text-emerald-600">accepted</span>
      ) : (
        <>
          <button
            onClick={() => onRevert(turnId)}
            className="text-red-400 hover:text-red-300 underline"
          >
            undo
          </button>
          <button
            onClick={() => onAccept(turnId)}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            accept
          </button>
        </>
      )}
    </div>
  );
}
