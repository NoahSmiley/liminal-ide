import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { NewTaskDialog } from "@/components/board/NewTaskDialog";
import { StatusMoveDialog } from "@/components/board/StatusMoveDialog";
import { useBoardKeyboard } from "@/hooks/useBoardKeyboard";
import { useBoardStore } from "@/stores/boardStore";
import { useUIStore } from "@/stores/uiStore";
import type { Task, TaskStatus } from "@/types/board";

export function BoardPage() {
  const { id: projectId } = useParams();
  const tasks = useBoardStore((s) => s.tasks).filter(
    (t) => t.projectId === projectId,
  );
  const activeModal = useUIStore((s) => s.activeModal);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);

  const [moveTarget, setMoveTarget] = useState<Task | null>(null);

  const tasksByColumn = useCallback(
    (status: TaskStatus) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order),
    [tasks],
  );

  const { selectedCardId } = useBoardKeyboard({
    tasksByColumn,
    enabled: true,
    onOpenTask: () => {},
    onMoveTask: (task) => setMoveTarget(task),
  });

  if (!projectId) return null;

  return (
    <div className="flex h-full flex-col p-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[10px] text-muted-foreground">
          BOARD{" "}
          <span className="text-foreground">[{tasks.length}]</span>
          <span className="text-muted-foreground/30 ml-2">
            [n]ew [m]ove [←→]cols [j/k]nav
          </span>
        </span>
        <button
          onClick={() => openModal("new-task")}
          className="text-[10px] text-muted-foreground border border-panel-border px-1 py-0"
        >
          +new
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard projectId={projectId} selectedCardId={selectedCardId} />
      </div>
      <NewTaskDialog
        open={activeModal === "new-task"}
        onClose={closeModal}
        projectId={projectId}
      />
      <StatusMoveDialog
        task={moveTarget}
        onClose={() => setMoveTarget(null)}
      />
    </div>
  );
}
