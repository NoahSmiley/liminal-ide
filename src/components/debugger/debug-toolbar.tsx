import type { DebugState } from "../../types/debug-types";

interface DebugToolbarProps {
  state: DebugState;
  onContinue: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onStop: () => void;
}

function stateLabel(state: DebugState): string {
  switch (state.state) {
    case "Stopped": return "stopped";
    case "Running": return "running";
    case "Paused": return `paused (${state.reason})`;
    case "Exited": return `exited (${state.code})`;
  }
}

function stateColor(state: DebugState): string {
  switch (state.state) {
    case "Stopped": return "text-zinc-600";
    case "Running": return "text-cyan-400";
    case "Paused": return "text-amber-400";
    case "Exited": return "text-zinc-500";
  }
}

export function DebugToolbar({ state, onContinue, onStepOver, onStepInto, onStepOut, onStop }: DebugToolbarProps) {
  const paused = state.state === "Paused";
  const running = state.state === "Running" || paused;

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-zinc-800/60 text-[10px]">
      <span className={`${stateColor(state)} font-bold`}>{stateLabel(state)}</span>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onContinue} disabled={!paused} className="text-cyan-600 hover:text-cyan-400 disabled:text-zinc-800">
          resume
        </button>
        <button onClick={onStepOver} disabled={!paused} className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800">
          over
        </button>
        <button onClick={onStepInto} disabled={!paused} className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800">
          into
        </button>
        <button onClick={onStepOut} disabled={!paused} className="text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800">
          out
        </button>
        <button onClick={onStop} disabled={!running} className="text-red-600 hover:text-red-400 disabled:text-zinc-800">
          stop
        </button>
      </div>
    </div>
  );
}
