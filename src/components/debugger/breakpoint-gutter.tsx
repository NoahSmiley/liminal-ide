import type { Breakpoint } from "../../types/debug-types";

interface BreakpointGutterProps {
  breakpoints: Breakpoint[];
  currentFile: string | null;
  onToggle: (path: string, line: number) => void;
  lineCount: number;
}

export function BreakpointGutter({ breakpoints, currentFile, onToggle, lineCount }: BreakpointGutterProps) {
  if (!currentFile) return null;

  const fileBps = new Set(
    breakpoints
      .filter((bp) => bp.path === currentFile)
      .map((bp) => bp.line)
  );

  const lines = Array.from({ length: Math.min(lineCount, 500) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col select-none" style={{ minWidth: 16 }}>
      {lines.map((line) => (
        <button
          key={line}
          onClick={() => onToggle(currentFile, line)}
          className="h-[16px] w-4 flex items-center justify-center hover:bg-zinc-900"
          title={fileBps.has(line) ? `Remove breakpoint at line ${line}` : `Add breakpoint at line ${line}`}
        >
          {fileBps.has(line) && (
            <span className="w-2 h-2 rounded-full bg-red-500 block" />
          )}
        </button>
      ))}
    </div>
  );
}
