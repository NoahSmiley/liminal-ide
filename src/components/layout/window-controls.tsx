import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowControls() {
  const win = getCurrentWindow();

  return (
    <div className="flex items-center gap-1 ml-1 border-l border-zinc-800/50 pl-3">
      <button
        onClick={() => win.minimize()}
        className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        title="Minimize"
      >
        <svg width="12" height="1.5" viewBox="0 0 12 1.5"><rect fill="currentColor" width="12" height="1.5" /></svg>
      </button>
      <button
        onClick={() => win.toggleMaximize()}
        className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        title="Maximize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="0.5" y="0.5" width="11" height="11" stroke="currentColor" strokeWidth="1.3" /></svg>
      </button>
      <button
        onClick={() => win.close()}
        className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-red-900/60 transition-colors"
        title="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" /><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
    </div>
  );
}
