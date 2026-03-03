import type { CollabStatus } from "../../types/collab-types";

interface CollabIndicatorProps {
  status: CollabStatus;
  onShare: () => void;
  onLeave: () => void;
}

export function CollabIndicator({ status, onShare, onLeave }: CollabIndicatorProps) {
  if (!status.connected) {
    return (
      <button
        onClick={onShare}
        className="text-[10px] text-zinc-600 hover:text-zinc-400"
        title="Start collaborative session"
        data-tutorial="collab-indicator"
      >
        share
      </button>
    );
  }

  return (
    <div data-tutorial="collab-indicator" className="flex items-center gap-1 text-[10px]">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      <span className="text-green-400" title={`Room: ${status.room_id}`}>
        live
      </span>
      <span className="text-zinc-700">{status.room_id}</span>
      <button
        onClick={onLeave}
        className="text-zinc-700 hover:text-red-400 ml-1"
      >
        leave
      </button>
    </div>
  );
}
