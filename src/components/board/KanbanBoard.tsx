import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { useBoardStore } from "@/stores/boardStore";
import type { Task, TaskStatus } from "@/types/board";

const COLUMNS: TaskStatus[] = ["backlog", "in_progress", "in_review", "done"];

interface KanbanBoardProps {
  projectId: string;
  selectedCardId?: string | null;
}

export function KanbanBoard({ projectId, selectedCardId }: KanbanBoardProps) {
  const tasks = useBoardStore((s) => s.tasks).filter(
    (t) => t.projectId === projectId,
  );
  const moveTask = useBoardStore((s) => s.moveTask);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const tasksByColumn = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;

      // Determine target column from over data
      const overData = over.data.current;
      let targetStatus: TaskStatus | null = null;

      if (overData?.type === "column") {
        targetStatus = overData.status as TaskStatus;
      } else if (overData?.type === "task") {
        const overTask = overData.task as Task;
        targetStatus = overTask.status;
      }

      if (!targetStatus) return;

      const task = tasks.find((t) => t.id === activeId);
      if (task && task.status !== targetStatus) {
        const destTasks = tasksByColumn(targetStatus);
        moveTask(activeId, targetStatus, destTasks.length);
      }
    },
    [tasks, moveTask, tasksByColumn],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeId = active.id as string;

      const overData = over.data.current;
      let targetStatus: TaskStatus | null = null;

      if (overData?.type === "column") {
        targetStatus = overData.status as TaskStatus;
      } else if (overData?.type === "task") {
        const overTask = overData.task as Task;
        targetStatus = overTask.status;
      }

      if (!targetStatus) return;

      const task = tasks.find((t) => t.id === activeId);
      if (!task) return;

      // Find the index to insert at
      const destTasks = tasks
        .filter((t) => t.status === targetStatus && t.id !== activeId)
        .sort((a, b) => a.order - b.order);

      const overIndex = overData?.type === "task"
        ? destTasks.findIndex((t) => t.id === over.id)
        : destTasks.length;

      const insertAt = overIndex >= 0 ? overIndex : destTasks.length;
      moveTask(activeId, targetStatus, insertAt);
    },
    [tasks, moveTask],
  );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-1 overflow-x-auto">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByColumn(status)}
              selectedCardId={selectedCardId}
              onCardClick={setSelectedTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <KanbanCard task={activeTask} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
