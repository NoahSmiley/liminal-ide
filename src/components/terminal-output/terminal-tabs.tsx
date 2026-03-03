interface TerminalTabsProps {
  terminalIds: string[];
  activeTerminal: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

function shortId(id: string): string {
  return id.slice(0, 6);
}

export function TerminalTabs({ terminalIds, activeTerminal, onSelect, onClose, onNew }: TerminalTabsProps) {
  return (
    <div className="flex items-center gap-0 border-b border-zinc-800/40 text-[10px]">
      {terminalIds.map((id) => {
        const isActive = id === activeTerminal;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-1 px-2 py-0.5 border-r border-zinc-800/40 ${
              isActive ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span>{shortId(id)}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onClose(id); }}
              className="text-zinc-700 hover:text-zinc-400 ml-1"
              role="button"
            >
              x
            </span>
          </button>
        );
      })}
      <button onClick={onNew} className="px-2 py-0.5 text-zinc-600 hover:text-zinc-400" title="new terminal">
        +
      </button>
    </div>
  );
}
