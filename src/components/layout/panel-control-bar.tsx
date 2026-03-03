import type { MainView } from "../../stores/ui-store";

interface PanelControlBarProps {
  mainView: MainView;
  terminalOpen: boolean;
  onSetView: (view: MainView) => void;
  onToggleTerminal: () => void;
}

export function PanelControlBar({
  mainView,
  terminalOpen,
  onSetView,
  onToggleTerminal,
}: PanelControlBarProps) {
  const tab = (view: MainView, label: string) => {
    const active = mainView === view;
    return (
      <button
        onClick={() => onSetView(view)}
        title={`${label} (⌘E)`}
        className={`text-[11px] transition-colors ${
          active ? "text-zinc-400" : "text-zinc-700 hover:text-zinc-500"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div data-tutorial="panel-control-bar" className="flex items-center justify-between px-4 py-1.5">
      <div className="flex items-center gap-2">
        {tab("chat", "chat")}
        <span className="text-zinc-800 text-[10px]">/</span>
        {tab("editor", "editor")}
      </div>
      <button
        onClick={onToggleTerminal}
        title="terminal (⌘J)"
        className={`text-[11px] transition-colors ${
          terminalOpen ? "text-zinc-400" : "text-zinc-700 hover:text-zinc-500"
        }`}
      >
        terminal {terminalOpen ? "▲" : "▼"}
      </button>
    </div>
  );
}
