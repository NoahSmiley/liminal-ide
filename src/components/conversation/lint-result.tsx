import { useState } from "react";

interface LintResultProps {
  success: boolean;
  output: string;
  command: string;
  onSendToAi?: (prompt: string) => void;
  onDismiss: () => void;
}

export function LintResult({ success, output, command, onSendToAi, onDismiss }: LintResultProps) {
  const [expanded, setExpanded] = useState(!success);

  return (
    <div className="flex flex-col gap-1 px-2 py-1 text-[11px] border border-zinc-800/40 rounded bg-zinc-950/50 my-1">
      <div className="flex items-center gap-2">
        <span className={success ? "text-emerald-500" : "text-red-400"}>
          {success ? "v" : "x"}
        </span>
        <span className="text-zinc-400">{command}</span>
        {!success && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-600 hover:text-zinc-400"
          >
            {expanded ? "hide" : "show"}
          </button>
        )}
        <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 ml-auto">
          dismiss
        </button>
      </div>
      {expanded && !success && (
        <div className="mt-1">
          <pre className="text-red-300/80 text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap">
            {output}
          </pre>
          {onSendToAi && (
            <button
              onClick={() => onSendToAi(`Fix these lint errors:\n\`\`\`\n${output}\n\`\`\``)}
              className="mt-1 text-cyan-400 hover:text-cyan-300 underline text-[10px]"
            >
              send to AI
            </button>
          )}
        </div>
      )}
    </div>
  );
}
