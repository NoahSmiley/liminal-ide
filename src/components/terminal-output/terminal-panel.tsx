import { useEffect, useRef } from "react";

interface TerminalPanelProps {
  output: string;
  exited: boolean;
  exitCode: number | null;
  pendingError?: string | null;
  onAcceptInterpret?: () => void;
  onDismissInterpret?: () => void;
  onPinOutput?: (content: string) => void;
}

export function TerminalPanel({
  output, exited, exitCode,
  pendingError, onAcceptInterpret, onDismissInterpret, onPinOutput,
}: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [output]);

  return (
    <div data-tutorial="terminal-panel" className="font-mono text-[12px] max-h-64 overflow-y-auto">
      <pre className="text-zinc-400 whitespace-pre-wrap">{output}</pre>
      {exited && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[11px] ${exitCode === 0 ? "text-sky-500" : "text-red-400"}`}>
            process exited with code {exitCode}
          </span>
          {output && onPinOutput && (
            <button
              onClick={() => onPinOutput(output.slice(-2000))}
              className="text-[10px] text-zinc-600 hover:text-cyan-400 underline"
            >
              pin output
            </button>
          )}
        </div>
      )}
      {pendingError && (
        <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-400">
          <span>command failed -- interpret?</span>
          <button onClick={onAcceptInterpret} className="text-cyan-400 hover:text-cyan-300 underline">y</button>
          <button onClick={onDismissInterpret} className="text-zinc-500 hover:text-zinc-400 underline">n</button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
