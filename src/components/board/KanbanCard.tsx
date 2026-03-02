import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAgentStore } from "@/stores/agentStore";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/board";

interface KanbanCardProps {
  task: Task;
  isDragOverlay?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "lo",
  medium: "md",
  high: "hi",
  urgent: "!!",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-zinc-500",
  medium: "text-blue-400",
  high: "text-amber-400",
  urgent: "text-red-400",
};

export function KanbanCard({ task, isDragOverlay, isSelected, onClick }: KanbanCardProps) {
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === task.assignedAgentId));
  const cardRef = useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isSelected]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={agent ? { ...style, borderLeftColor: agent.color } : style}
      data-kb-selected={isSelected || undefined}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "border-l-2 border-border bg-card px-2 py-1",
        isDragging && "opacity-50",
        isDragOverlay && "bg-secondary",
        isSelected && "bg-secondary/30",
      )}
    >
      <p className="text-[11px] text-foreground leading-snug">
        {task.title}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className={PRIORITY_COLORS[task.priority]}>
          [{PRIORITY_LABELS[task.priority]}]
        </span>
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        {agent && (
          <span className="ml-auto">{agent.name.toLowerCase()}</span>
        )}
      </div>
    </div>
  );
}
