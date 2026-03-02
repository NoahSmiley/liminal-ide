import { useBoardStore } from "@/stores/boardStore";
import type { TaskStatus } from "@/types/board";

export function useBoard(projectId: string) {
  const tasks = useBoardStore((s) => s.tasks).filter(
    (t) => t.projectId === projectId,
  );

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  return {
    tasks,
    tasksByStatus,
    totalTasks,
    completedTasks,
  };
}
