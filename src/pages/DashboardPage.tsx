import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAgentStore } from "@/stores/agentStore";
import { useBoardStore } from "@/stores/boardStore";
import { AgentStatusDot } from "@/components/agents/AgentStatusDot";
import { TaskDetailSheet } from "@/components/board/TaskDetailSheet";
import { TuiPanel } from "@/components/shared/TuiPanel";
import { ROLE_LABELS } from "@/data/agents";
import { useDashboardKeyboard } from "@/hooks/useDashboardKeyboard";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/board";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "BACK" },
  { status: "in_progress", label: "PROG" },
  { status: "in_review", label: "REVW" },
  { status: "done", label: "DONE" },
];

export function DashboardPage() {
  const { id: projectId } = useParams();
  const agents = useAgentStore((s) => s.agents);
  const tasks = useBoardStore((s) => s.tasks).filter(
    (t) => t.projectId === projectId,
  );

  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [tasks],
  );

  const [detailTask, setDetailTask] = useState<(typeof tasks)[number] | null>(null);

  const handleSelect = useCallback(
    (index: number) => {
      const task = recentTasks[index];
      if (task) setDetailTask(task);
    },
    [recentTasks],
  );

  const { selectedIndex } = useDashboardKeyboard({
    taskCount: recentTasks.length,
    onSelect: handleSelect,
  });

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status).length;

  return (
    <div className="flex h-full flex-col gap-1 p-1">
      {/* Status summary bar */}
      <TuiPanel title="status" className="shrink-0">
        <div className="flex items-center gap-4 text-[10px]">
          {COLUMNS.map((col) => (
            <span key={col.status} className="text-muted-foreground">
              {col.label}{" "}
              <span className="text-foreground">{tasksByStatus(col.status)}</span>
            </span>
          ))}
          <span className="ml-auto text-muted-foreground">
            total <span className="text-foreground">{tasks.length}</span>
          </span>
        </div>
      </TuiPanel>

      {/* Main grid — team + recent side by side */}
      <div className="flex flex-1 gap-1 min-h-0">
        {/* Team panel */}
        <TuiPanel title="team" className="w-1/3 shrink-0 overflow-auto">
          <div className="space-y-0">
            {agents.map((agent) => {
              const agentTasks = tasks.filter((t) => t.assignedAgentId === agent.id);
              const activeTasks = agentTasks.filter(
                (t) => t.status === "in_progress" || t.status === "in_review",
              );
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 border-l-2 px-2 py-1"
                  style={{ borderLeftColor: agent.color }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-foreground">{agent.name}</span>
                      <AgentStatusDot status={agent.status} />
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">
                      {ROLE_LABELS[agent.role]}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activeTasks.length}/{agentTasks.length}
                  </span>
                </div>
              );
            })}
          </div>
        </TuiPanel>

        {/* Recent tasks panel */}
        <TuiPanel title="recent" className="flex-1 overflow-auto">
          <div className="space-y-0">
            {recentTasks.map((task, idx) => {
              const agent = agents.find((a) => a.id === task.assignedAgentId);
              return (
                <div
                  key={task.id}
                  data-kb-selected={idx === selectedIndex || undefined}
                  onClick={() => setDetailTask(task)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-0.5 text-[10px] cursor-pointer",
                    idx === selectedIndex && "bg-secondary/30",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground w-16 text-right">
                    [{task.status.replace("_", " ").toUpperCase()}]
                  </span>
                  <span className="flex-1 truncate text-foreground text-xs">
                    {task.title}
                  </span>
                  {agent && (
                    <span className="shrink-0 text-[10px]" style={{ color: agent.color }}>
                      {agent.name.toLowerCase()}
                    </span>
                  )}
                </div>
              );
            })}
            {recentTasks.length === 0 && (
              <span className="text-[10px] text-muted-foreground/40 px-2">
                no tasks yet
              </span>
            )}
          </div>
        </TuiPanel>
      </div>

      <TaskDetailSheet task={detailTask} onClose={() => setDetailTask(null)} />
    </div>
  );
}
