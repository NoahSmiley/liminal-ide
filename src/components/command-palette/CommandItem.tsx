import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Command } from "./useCommands";

interface CommandItemProps {
  command: Command;
  selected: boolean;
  onSelect: () => void;
  onExecute: () => void;
}

export function CommandItem({
  command,
  selected,
  onSelect,
  onExecute,
}: CommandItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  return (
    <button
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between px-3 py-1 text-xs text-left",
        selected
          ? "bg-secondary/50 text-foreground"
          : "text-muted-foreground",
      )}
      onMouseEnter={onSelect}
      onClick={onExecute}
    >
      <span>
        <span className="text-muted-foreground">$ </span>
        {command.label}
      </span>
      {command.shortcut ? (
        <kbd className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">
          {command.shortcut}
        </kbd>
      ) : (
        <span className="text-[10px] text-muted-foreground">[{command.group}]</span>
      )}
    </button>
  );
}
