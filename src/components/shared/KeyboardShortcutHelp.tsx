import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

const SHORTCUTS = [
  { key: ":", desc: "terminal input" },
  { key: "cmd+k", desc: "command palette" },
  { key: "?", desc: "this help" },
  { key: "1-5", desc: "navigate pages" },
  { key: "j/k", desc: "move through items" },
  { key: "h/l", desc: "move between columns" },
  { key: "enter", desc: "open / select" },
  { key: "n", desc: "new task / project" },
  { key: "m", desc: "move task (board)" },
  { key: "shift+j/k", desc: "reorder card (board)" },
  { key: "t", desc: "cycle agent (chat)" },
  { key: "/", desc: "focus chat input" },
  { key: "cmd+s", desc: "save (settings)" },
  { key: "cmd+/-", desc: "zoom in / out" },
  { key: "cmd+0", desc: "reset zoom" },
  { key: "esc", desc: "close / back" },
  { key: ":hacker mode", desc: "toggle hacker mode" },
];

export function KeyboardShortcutHelp() {
  const open = useUIStore((s) => s.shortcutHelpOpen);
  const close = useUIStore((s) => s.closeShortcutHelp);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/80" onClick={close}>
      <div className="w-full max-w-sm border border-panel-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          $ help --shortcuts
        </div>
        <div className="px-3 py-2 space-y-0.5">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center text-xs">
              <span className="w-20 shrink-0 text-foreground">
                {s.key}
              </span>
              <span className="text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground/30">
          ? or esc to close
        </div>
      </div>
    </div>
  );
}
