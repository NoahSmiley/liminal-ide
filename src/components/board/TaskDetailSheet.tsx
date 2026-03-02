import { useEffect, useCallback } from "react";
import { useAgentStore } from "@/stores/agentStore";
import { useBoardStore } from "@/stores/boardStore";
import type { Task, TaskStatus, TaskPriority } from "@/types/board";

interface TaskDetailSheetProps {
  task: Task | null;
  onClose: () => void;
}

const STATUSES: TaskStatus[] = ["backlog", "in_progress", "in_review", "done"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const PRIORITY_DISPLAY: Record<TaskPriority, string> = {
  low: "lo", medium: "md", high: "hi", urgent: "!!",
};

export function TaskDetailSheet({ task, onClose }: TaskDetailSheetProps) {
  const agents = useAgentStore((s) => s.agents);
  const { updateTask, deleteTask } = useBoardStore();
  const agent = task ? agents.find((a) => a.id === task.assignedAgentId) : null;

  const cycleStatus = useCallback(() => {
    if (!task) return;
    const idx = STATUSES.indexOf(task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length]!;
    updateTask(task.id, { status: next });
  }, [task, updateTask]);

  const cyclePriority = useCallback(() => {
    if (!task) return;
    const idx = PRIORITIES.indexOf(task.priority);
    const next = PRIORITIES[(idx + 1) % PRIORITIES.length]!;
    updateTask(task.id, { priority: next });
  }, [task, updateTask]);

  const cycleAgent = useCallback(() => {
    if (!task) return;
    const options = [null, ...agents.map((a) => a.id)];
    const idx = options.indexOf(task.assignedAgentId);
    const next = options[(idx + 1) % options.length]!;
    updateTask(task.id, { assignedAgentId: next });
  }, [task, agents, updateTask]);

  useEffect(() => {
    if (!task) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "s") { e.preventDefault(); cycleStatus(); return; }
      if (e.key === "p") { e.preventDefault(); cyclePriority(); return; }
      if (e.key === "a") { e.preventDefault(); cycleAgent(); return; }
      if (e.key === "d" || e.key === "Backspace") {
        e.preventDefault();
        deleteTask(task.id);
        onClose();
        return;
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [task, onClose, cycleStatus, cyclePriority, cycleAgent, deleteTask]);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15%] bg-background/80" onClick={onClose}>
      <div className="w-full max-w-lg border border-panel-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          $ task --detail
        </div>

        <div className="px-3 py-2 space-y-1">
          <div className="text-xs text-foreground">{task.title}</div>
          {task.description && (
            <div className="text-[10px] text-muted-foreground">{task.description}</div>
          )}
        </div>

        <div className="border-t border-border px-3 py-1.5 space-y-0.5">
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-muted-foreground w-14">status</span>
            <button onClick={cycleStatus} className="text-foreground">
              [{task.status.replace("_", " ")}]
            </button>
            <span className="text-muted-foreground/30">s</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-muted-foreground w-14">priority</span>
            <button onClick={cyclePriority} className="text-foreground">
              [{PRIORITY_DISPLAY[task.priority]}]
            </button>
            <span className="text-muted-foreground/30">p</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-muted-foreground w-14">agent</span>
            <button onClick={cycleAgent} className="text-foreground" style={agent ? { color: agent.color } : undefined}>
              [{agent ? agent.name.toLowerCase() : "none"}]
            </button>
            <span className="text-muted-foreground/30">a</span>
          </div>
          {task.tags.length > 0 && (
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-muted-foreground w-14">tags</span>
              <span className="text-foreground">
                {task.tags.map((t) => `[${t}]`).join(" ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground/30">
          s/p/a cycle · d delete · esc close
        </div>
      </div>
    </div>
  );
}
