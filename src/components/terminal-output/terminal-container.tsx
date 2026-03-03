import { TerminalTabs } from "./terminal-tabs";
import { TerminalPanel } from "./terminal-panel";

interface TerminalContainerProps {
  terminalIds: string[];
  activeTerminal: string | null;
  activeOutput: string;
  activeExited: boolean;
  activeExitCode: number | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  pendingError: string | null;
  onAcceptInterpret: () => void;
  onDismissInterpret: () => void;
  onPinOutput: (content: string) => void;
}

export function TerminalContainer({
  terminalIds, activeTerminal, activeOutput, activeExited, activeExitCode,
  onSelect, onClose, onNew,
  pendingError, onAcceptInterpret, onDismissInterpret, onPinOutput,
}: TerminalContainerProps) {
  return (
    <div className="flex flex-col">
      <TerminalTabs
        terminalIds={terminalIds}
        activeTerminal={activeTerminal}
        onSelect={onSelect}
        onClose={onClose}
        onNew={onNew}
      />
      {activeTerminal ? (
        <TerminalPanel
          output={activeOutput}
          exited={activeExited}
          exitCode={activeExitCode}
          pendingError={pendingError}
          onAcceptInterpret={onAcceptInterpret}
          onDismissInterpret={onDismissInterpret}
          onPinOutput={onPinOutput}
        />
      ) : (
        <div className="p-3 text-[10px] text-zinc-700">no terminal — click + to create one</div>
      )}
    </div>
  );
}
