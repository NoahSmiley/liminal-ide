import { useEffect, useRef } from "react";

interface TerminalPanelProps {
  output: string;
  exited: boolean;
  exitCode: number | null;
}

export function TerminalPanel({
  output,
  exited,
  exitCode,
}: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [output]);

  return (
    <div className="font-mono text-[12px] max-h-48 overflow-y-auto">
      <pre className="text-zinc-400 whitespace-pre-wrap">{output}</pre>
      {exited && (
        <div
          className={`text-[11px] mt-1 ${exitCode === 0 ? "text-emerald-500" : "text-red-400"}`}
        >
          process exited with code {exitCode}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
