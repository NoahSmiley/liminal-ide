import type { StackFrame } from "../../types/debug-types";

interface CallStackProps {
  frames: StackFrame[];
  onSelectFrame: (frame: StackFrame) => void;
}

export function CallStack({ frames, onSelectFrame }: CallStackProps) {
  if (frames.length === 0) {
    return <div className="text-[9px] text-zinc-700 p-2">no call stack</div>;
  }

  return (
    <div className="overflow-y-auto max-h-[100px]">
      {frames.map((frame, i) => (
        <button
          key={frame.id}
          onClick={() => onSelectFrame(frame)}
          className="flex items-center gap-2 w-full px-2 py-0.5 text-[10px] text-left hover:bg-zinc-900/50"
        >
          <span className="text-zinc-700 shrink-0 w-4 text-right">{i}</span>
          <span className="text-cyan-400 truncate">{frame.name}</span>
          {frame.source_path && (
            <span className="text-zinc-700 truncate ml-auto text-[9px]">
              {frame.source_path.split("/").pop()}:{frame.line}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
