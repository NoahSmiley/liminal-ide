import type { MainView } from "../../stores/ui-store";

interface PanelControlBarProps {
  mainView: MainView;
  hasEditorFiles: boolean;
  onSetView: (view: MainView) => void;
}

export function PanelControlBar({
  mainView,
  hasEditorFiles,
  onSetView,
}: PanelControlBarProps) {
  if (!hasEditorFiles && mainView === "chat") return null;

  return (
    <div data-tutorial="panel-control-bar" className="flex items-center px-4 py-1.5 border-b border-border/30">
      <div className="inline-flex border border-border/50 rounded-[3px] overflow-hidden text-[11px]">
        <button
          onClick={() => onSetView("chat")}
          className={`px-3 py-1 transition-colors ${
            mainView === "chat" ? "bg-zinc-800/30 text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          agent
        </button>
        {hasEditorFiles && (
          <button
            onClick={() => onSetView("editor")}
            className={`px-3 py-1 transition-colors border-l border-border/50 ${
              mainView === "editor" ? "bg-zinc-800/30 text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            editor
          </button>
        )}
      </div>
    </div>
  );
}
