import { TuiPanel } from "../shared/tui-panel";
import { TerminalPanel } from "../terminal-output/terminal-panel";
import { TerminalTabs } from "../terminal-output/terminal-tabs";

export interface AppPanelsProps {
  terminalOpen: boolean;
  terminal: { output: string; exited: boolean; exitCode: number | null; pendingError: string | null; onAcceptInterpret: () => void; onDismissInterpret: () => void; onPinOutput: (c: string) => void };
  multiTerminal: { terminalIds: string[]; activeTerminal: string | null; onSpawn: () => void; onKill: (id: string) => void; onSelect: (id: string) => void };
}

export function AppPanels(p: AppPanelsProps) {
  if (!p.terminalOpen) return null;
  return (
    <TuiPanel title="terminal" className="mx-3 mb-2">
      <TerminalTabs terminalIds={p.multiTerminal.terminalIds} activeTerminal={p.multiTerminal.activeTerminal}
        onSelect={p.multiTerminal.onSelect} onClose={p.multiTerminal.onKill} onNew={p.multiTerminal.onSpawn} />
      <TerminalPanel output={p.terminal.output} exited={p.terminal.exited} exitCode={p.terminal.exitCode}
        pendingError={p.terminal.pendingError} onAcceptInterpret={p.terminal.onAcceptInterpret}
        onDismissInterpret={p.terminal.onDismissInterpret} onPinOutput={p.terminal.onPinOutput} />
    </TuiPanel>
  );
}
