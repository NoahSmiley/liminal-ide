import type { PinnedContext } from "../../types/context-types";

interface PinnedChipsProps {
  pins: PinnedContext[];
  onUnpin: (id: string) => void;
}

export function PinnedChips({ pins, onUnpin }: PinnedChipsProps) {
  if (pins.length === 0) return null;

  return (
    <div data-tutorial="pinned-chips" className="flex flex-wrap gap-1 px-4 py-1">
      {pins.map((pin) => {
        const label = pin.kind === "File" ? pin.path : pin.label;
        return (
          <span
            key={pin.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400"
          >
            <span className="text-zinc-600">{pin.kind === "File" ? "#" : "@"}</span>
            <span className="truncate max-w-32">{label}</span>
            <button
              onClick={() => onUnpin(pin.id)}
              className="text-zinc-600 hover:text-zinc-300 ml-0.5"
            >
              x
            </button>
          </span>
        );
      })}
    </div>
  );
}
