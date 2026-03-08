import type { SidebarTab, MainView } from "../../stores/ui-store";

interface ActivityBarProps {
  sidebarTab: SidebarTab | null;
  mainView: MainView;
  hasEditorFiles: boolean;
  previewUrl: string | null;
  previewLive: boolean;
  guidedEnabled: boolean;
  onToggleSidebarTab: (tab: SidebarTab) => void;
  onToggleSettings: () => void;
  onToggleTerminal: () => void;
  onTogglePreview: () => void;
  onTogglePair: () => void;
  onToggleGuided: () => void;
  onSetView: (view: MainView) => void;
}

// Each icon sized individually to look visually uniform
const sidebarItems: { tab: SidebarTab; label: string; size: string; title: string }[] = [
  { tab: "files",   label: "\u229E", size: "text-[14px]", title: "files (\u2318B)" },
  { tab: "search",  label: "\u2315", size: "text-[21px]", title: "search (\u2318\u21E7F)" },
  { tab: "git",     label: "\u2387", size: "text-[14px]", title: "git (\u2318\u21E7G)" },
  { tab: "plugins", label: "\u29C9", size: "text-[14px]", title: "plugins" },
];

const btn = "relative w-[34px] h-[34px] flex items-center justify-center rounded-[3px] transition-colors mb-0.5";

export function ActivityBar({ sidebarTab, mainView, hasEditorFiles, previewUrl, previewLive, guidedEnabled, onToggleSidebarTab, onToggleSettings, onToggleTerminal, onTogglePreview, onTogglePair, onToggleGuided, onSetView }: ActivityBarProps) {
  return (
    <div className="flex flex-col items-center w-[42px] shrink-0 border-r border-border/30 bg-background pt-1 pb-2">
      {/* Agent / Editor — distinct: background fill */}
      <div className="flex flex-col items-center gap-0.5 mb-1 px-[3px] w-full">
        <button
          onClick={() => onSetView("chat")}
          title="agent"
          className={`w-full h-[34px] flex items-center justify-center text-[18px] rounded-[4px] transition-all ${
            mainView === "chat"
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]"
          }`}
        >
          {"\u2726"}
        </button>
        {hasEditorFiles && (
          <button
            onClick={() => onSetView("editor")}
            title="editor"
            className={`w-full h-[34px] flex items-center justify-center text-[7px] font-mono rounded-[4px] transition-all ${
              mainView === "editor"
                ? "bg-cyan-500/15 text-cyan-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]"
            }`}
          >
            {"</>"}
          </button>
        )}
      </div>

      <div className="w-[20px] border-t border-zinc-800/40 mb-1" />

      {/* All items below share one selection — left bar indicator */}
      {sidebarItems.map((item) => {
        const active = sidebarTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => onToggleSidebarTab(item.tab)}
            title={item.title}
            className={`${btn} ${item.size} ${
              active ? "text-zinc-300" : "text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.02]"
            }`}
          >
            {active && <div className="absolute left-0 top-[6px] bottom-[6px] w-[2px] bg-zinc-400 rounded-r" />}
            {item.label}
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Guided mode toggle */}
      <button
        onClick={onToggleGuided}
        title="guided mode (⌘⇧G)"
        className={`${btn} text-[14px] ${
          guidedEnabled ? "text-purple-400" : "text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.02]"
        }`}
      >
        {"⊛"}
      </button>

      {[
        { view: "terminal" as const, label: ">_", size: "text-[12px] font-mono", onClick: onToggleTerminal, title: "terminal" },
      ].map(({ view, label, size, onClick, title }) => {
        const active = mainView === view;
        return (
          <button key={view} onClick={onClick} title={title}
            className={`${btn} ${size} ${active ? "text-zinc-300" : "text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.02]"}`}
          >
            {active && <div className="absolute left-0 top-[6px] bottom-[6px] w-[2px] bg-zinc-400 rounded-r" />}
            {label}
          </button>
        );
      })}

      {(previewLive || mainView === "preview") && (
        <button
          onClick={onTogglePreview}
          title={`web preview — ${previewUrl}`}
          className={`${btn} text-[13px] ${
            mainView === "preview"
              ? "text-zinc-300"
              : "text-cyan-400 hover:text-cyan-300 animate-preview-glow"
          }`}
        >
          {mainView === "preview" && <div className="absolute left-0 top-[6px] bottom-[6px] w-[2px] bg-zinc-400 rounded-r" />}
          {"\u25B6"}
        </button>
      )}

      {[
        { view: "pair" as const, label: "\u21CB", size: "text-[15px]", onClick: onTogglePair, title: "pair device" },
        { view: "settings" as const, label: "\u2699", size: "text-[15px]", onClick: onToggleSettings, title: "settings" },
      ].map(({ view, label, size, onClick, title }) => {
        const active = mainView === view;
        return (
          <button key={view} onClick={onClick} title={title}
            className={`${btn} ${size} ${active ? "text-zinc-300" : "text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.02]"}`}
          >
            {active && <div className="absolute left-0 top-[6px] bottom-[6px] w-[2px] bg-zinc-400 rounded-r" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
