import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Task, TaskStatus, TaskPriority } from "@/types/board";

interface BoardState {
  tasks: Task[];
  getTasksByProject: (projectId: string) => Task[];
  getTasksByStatus: (projectId: string, status: TaskStatus) => Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "order">) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newOrder: number) => void;
  reorderTask: (id: string, newOrder: number) => void;
  swapTaskOrder: (taskId: string, direction: "up" | "down") => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],

  getTasksByProject: (projectId) =>
    get().tasks.filter((t) => t.projectId === projectId),

  getTasksByStatus: (projectId, status) =>
    get()
      .tasks.filter((t) => t.projectId === projectId && t.status === status)
      .sort((a, b) => a.order - b.order),

  addTask: (taskData) => {
    const now = Date.now();
    const siblings = get().tasks.filter(
      (t) => t.projectId === taskData.projectId && t.status === taskData.status,
    );
    const task: Task = {
      ...taskData,
      id: nanoid(),
      order: siblings.length,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
      ),
    })),

  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  moveTask: (id, newStatus, newOrder) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, order: newOrder, updatedAt: Date.now() }
          : t,
      ),
    })),

  reorderTask: (id, newOrder) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, order: newOrder, updatedAt: Date.now() } : t,
      ),
    })),

  swapTaskOrder: (taskId, direction) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const siblings = tasks
      .filter((t) => t.projectId === task.projectId && t.status === task.status)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((t) => t.id === taskId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const neighbor = siblings[swapIdx]!;
    const now = Date.now();
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === taskId) return { ...t, order: neighbor.order, updatedAt: now };
        if (t.id === neighbor.id) return { ...t, order: task.order, updatedAt: now };
        return t;
      }),
    }));
  },
}));

// Helper type for creating tasks from the UI
export type NewTaskInput = {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string | null;
  tags: string[];
};
