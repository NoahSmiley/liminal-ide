import { useState, useRef, useEffect } from "react";
import { useBoardStore } from "@/stores/boardStore";
import { useAgentStore } from "@/stores/agentStore";
import type { TaskPriority, TaskStatus } from "@/types/board";

interface NewTaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultStatus?: TaskStatus;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const PRIORITY_DISPLAY: Record<TaskPriority, string> = {
  low: "lo",
  medium: "md",
  high: "hi",
  urgent: "!!",
};

export function NewTaskDialog({ open, onClose, projectId, defaultStatus = "backlog" }: NewTaskDialogProps) {
  const addTask = useBoardStore((s) => s.addTask);
  const agents = useAgentStore((s) => s.agents);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [priorityIdx, setPriorityIdx] = useState(1); // default medium
  const [agentIdx, setAgentIdx] = useState(0); // 0 = unassigned

  const agentOptions = [{ id: "unassigned", name: "none" }, ...agents];

  useEffect(() => {
    if (open) {
      setTitle("");
      setPriorityIdx(1);
      setAgentIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleCreate = () => {
    if (!title.trim()) return;
    const agent = agentOptions[agentIdx];
    addTask({
      projectId,
      title: title.trim(),
      description: "",
      status: defaultStatus,
      priority: PRIORITIES[priorityIdx] ?? "medium",
      assignedAgentId: agent && agent.id !== "unassigned" ? agent.id : null,
      tags: [],
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Tab cycles priority
      e.preventDefault();
      setPriorityIdx((prev) => (prev + 1) % PRIORITIES.length);
    } else if (e.key === "Tab" && e.shiftKey) {
      // Shift+Tab cycles agent
      e.preventDefault();
      setAgentIdx((prev) => (prev + 1) % agentOptions.length);
    }
  };

  if (!open) return null;

  const currentPriority = PRIORITIES[priorityIdx] ?? "medium";
  const currentAgent = agentOptions[agentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/80" onClick={onClose}>
      <div className="w-full max-w-md border border-panel-border bg-background p-0" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          $ new task
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">&gt;</span>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="task title"
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-border px-3 py-1.5 text-[10px]">
          <span className="text-muted-foreground">
            priority{" "}
            <span className="text-foreground">[{PRIORITY_DISPLAY[currentPriority]}]</span>
            <span className="text-muted-foreground/30 ml-1">tab</span>
          </span>
          <span className="text-muted-foreground">
            agent{" "}
            <span className="text-foreground" style={currentAgent && currentAgent.id !== "unassigned"
              ? { color: agents.find((a) => a.id === currentAgent.id)?.color }
              : undefined
            }>
              [{currentAgent?.name.toLowerCase() ?? "none"}]
            </span>
            <span className="text-muted-foreground/30 ml-1">shift+tab</span>
          </span>
          <span className="ml-auto text-muted-foreground/30">
            enter create · esc cancel
          </span>
        </div>
      </div>
    </div>
  );
}
