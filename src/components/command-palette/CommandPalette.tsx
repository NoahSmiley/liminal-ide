import { useState, useCallback, useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useCommands } from "./useCommands";
import { CommandItem } from "./CommandItem";
import type { Command } from "./useCommands";

const GROUP_ORDER: Command["group"][] = ["nav", "projects", "agents", "actions"];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const close = useUIStore((s) => s.closeCommandPalette);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useCommands();

  const filtered = query
    ? commands.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.includes(q) ||
          cmd.group.includes(q) ||
          cmd.keywords.some((kw) => kw.includes(q))
        );
      })
    : commands;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    commands: filtered.filter((cmd) => cmd.group === group),
  })).filter((g) => g.commands.length > 0);

  const flatList = grouped.flatMap((g) => g.commands);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, flatList.length - 1)));
  }, [flatList.length]);

  const execute = useCallback(
    (cmd: Command) => {
      cmd.action();
      close();
    },
    [close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown" || e.key === "j" && !query) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatList.length);
      } else if (e.key === "ArrowUp" || e.key === "k" && !query) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatList.length) % flatList.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatList[selectedIndex];
        if (cmd) execute(cmd);
      }
    },
    [flatList, selectedIndex, execute, close, query],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/80" onClick={close}>
      <div className="w-full max-w-lg border border-panel-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="text-xs text-muted-foreground">$</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="type a command..."
            className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/30"
          />
          <span className="text-[10px] text-muted-foreground/30">esc</span>
        </div>

        <div className="max-h-64 overflow-y-auto py-0.5">
          {flatList.length === 0 ? (
            <p className="px-3 py-2 text-[10px] text-muted-foreground/40">
              no matching commands
            </p>
          ) : (
            grouped.map((g) => (
              <div key={g.group}>
                <div className="px-3 pt-1.5 pb-0.5 text-[10px] text-muted-foreground/40">
                  [{g.group}]
                </div>
                {g.commands.map((cmd) => {
                  const idx = flatList.indexOf(cmd);
                  return (
                    <CommandItem
                      key={cmd.id}
                      command={cmd}
                      selected={idx === selectedIndex}
                      onSelect={() => setSelectedIndex(idx)}
                      onExecute={() => execute(cmd)}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
