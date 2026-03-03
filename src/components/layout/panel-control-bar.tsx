import type { MainView } from "../../stores/ui-store";

interface PanelControlBarProps {
  mainView: MainView;
  terminalOpen: boolean;
  hasEditorFiles: boolean;
  onSetView: (view: MainView) => void;
  onToggleTerminal: () => void;
}

export function PanelControlBar({
  mainView,
  terminalOpen,
  hasEditorFiles,
  onSetView,
  onToggleTerminal,
}: PanelControlBarProps) {
  const seg = (view: MainView, label: string) => {
    const active = mainView === view;
    return (
      <button
        onClick={() => onSetView(view)}
        title={`${label} (⌘E)`}
        className={`px-3 py-0.5 text-[13px] transition-colors ${
          active ? "bg-zinc-800/80 text-zinc-300 border border-zinc-700/50" : "text-zinc-600 hover:text-zinc-400"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div data-tutorial="panel-control-bar" className="flex items-center justify-between px-4 py-1.5">
      {hasEditorFiles ? (
        <div className="inline-flex border border-zinc-800/60 bg-zinc-950/50 p-0.5 gap-0.5">
          {seg("chat", "agent")}
          {seg("editor", "editor")}
        </div>
      ) : (
        <div />
      )}
      <button
        onClick={onToggleTerminal}
        title="terminal (⌘J)"
        className={`text-[13px] transition-colors ${
          terminalOpen ? "text-zinc-400" : "text-zinc-700 hover:text-zinc-500"
        }`}
      >
        terminal {terminalOpen ? "▲" : "▼"}
      </button>
    </div>
  );
}
