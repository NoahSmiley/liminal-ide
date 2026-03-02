import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/board";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  selectedCardId?: string | null;
  onCardClick: (task: Task) => void;
}

export function KanbanColumn({ status, tasks, selectedCardId, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div className="flex w-64 shrink-0 flex-col border border-panel-border">
      <KanbanColumnHeader status={status} count={tasks.length} />
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-px p-0.5",
          isOver && "bg-secondary/20",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isSelected={task.id === selectedCardId}
              onClick={() => onCardClick(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
