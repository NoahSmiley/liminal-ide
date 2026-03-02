import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/boardStore";
import type { Task, TaskStatus } from "@/types/board";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "backlog" },
  { value: "in_progress", label: "in_progress" },
  { value: "in_review", label: "in_review" },
  { value: "done", label: "done" },
];

interface StatusMoveDialogProps {
  task: Task | null;
  onClose: () => void;
}

export function StatusMoveDialog({ task, onClose }: StatusMoveDialogProps) {
  const moveTask = useBoardStore((s) => s.moveTask);
  const tasks = useBoardStore((s) => s.tasks);

  const currentIndex = task
    ? STATUS_OPTIONS.findIndex((o) => o.value === task.status)
    : 0;
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);

  useEffect(() => {
    if (task) {
      setSelectedIndex(
        STATUS_OPTIONS.findIndex((o) => o.value === task.status),
      );
    }
  }, [task]);

  const execute = useCallback(
    (status: TaskStatus) => {
      if (!task) return;
      if (status !== task.status) {
        const destTasks = tasks
          .filter((t) => t.status === status && t.id !== task.id)
          .sort((a, b) => a.order - b.order);
        moveTask(task.id, status, destTasks.length);
      }
      onClose();
    },
    [task, tasks, moveTask, onClose],
  );

  useEffect(() => {
    if (!task) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % STATUS_OPTIONS.length);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + STATUS_OPTIONS.length) % STATUS_OPTIONS.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = STATUS_OPTIONS[selectedIndex];
        if (opt) execute(opt.value);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [task, selectedIndex, execute, onClose]);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/80" onClick={onClose}>
      <div className="w-full max-w-xs border border-panel-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          $ move --status
        </div>
        <div className="py-0.5">
          {STATUS_OPTIONS.map((opt, idx) => {
            const isCurrent = task.status === opt.value;
            return (
              <button
                key={opt.value}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-1 text-xs text-left",
                  idx === selectedIndex
                    ? "bg-secondary/50 text-foreground"
                    : "text-muted-foreground",
                )}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => execute(opt.value)}
              >
                <span>
                  <span className="text-muted-foreground">{">"} </span>
                  {opt.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-muted-foreground">
                    (current)
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-t border-border px-3 py-1 text-[10px] text-muted-foreground/30">
          j/k navigate · enter select · esc cancel
        </div>
      </div>
    </div>
  );
}
