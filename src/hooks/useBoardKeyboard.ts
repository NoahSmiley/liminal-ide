import { useState, useCallback, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useBoardStore } from "@/stores/boardStore";
import type { Task, TaskStatus } from "@/types/board";

const COLUMNS: TaskStatus[] = ["backlog", "in_progress", "in_review", "done"];

interface UseBoardKeyboardOptions {
  tasksByColumn: (status: TaskStatus) => Task[];
  enabled?: boolean;
  onOpenTask: (task: Task) => void;
  onMoveTask: (task: Task) => void;
}

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useBoardKeyboard({
  tasksByColumn,
  enabled = true,
  onOpenTask,
  onMoveTask,
}: UseBoardKeyboardOptions) {
  const [colIndex, setColIndex] = useState(0);
  const [rowIndex, setRowIndex] = useState(-1);

  const currentColumn = COLUMNS[colIndex] ?? "backlog";
  const currentTasks = tasksByColumn(currentColumn);
  const selectedTask =
    rowIndex >= 0 && rowIndex < currentTasks.length
      ? currentTasks[rowIndex]
      : null;

  // Clamp rowIndex when tasks change
  useEffect(() => {
    if (currentTasks.length === 0) {
      setRowIndex(-1);
    } else if (rowIndex >= currentTasks.length) {
      setRowIndex(currentTasks.length - 1);
    }
  }, [currentTasks.length, rowIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || isInputFocused()) return;

      const { commandPaletteOpen, shortcutHelpOpen, activeModal } =
        useUIStore.getState();
      if (commandPaletteOpen || shortcutHelpOpen || activeModal !== null) return;

      // h/l or left/right — move between columns
      if (e.key === "h" || e.key === "ArrowLeft") {
        e.preventDefault();
        setColIndex((prev) => Math.max(0, prev - 1));
        setRowIndex((prev) => (prev < 0 ? 0 : prev));
        return;
      }
      if (e.key === "l" || e.key === "ArrowRight") {
        e.preventDefault();
        setColIndex((prev) => Math.min(COLUMNS.length - 1, prev + 1));
        setRowIndex((prev) => (prev < 0 ? 0 : prev));
        return;
      }

      // Shift+j/k — reorder card within column
      if (e.shiftKey && e.key === "J" && selectedTask) {
        e.preventDefault();
        useBoardStore.getState().swapTaskOrder(selectedTask.id, "down");
        setRowIndex((prev) => Math.min(prev + 1, currentTasks.length - 1));
        return;
      }
      if (e.shiftKey && e.key === "K" && selectedTask) {
        e.preventDefault();
        useBoardStore.getState().swapTaskOrder(selectedTask.id, "up");
        setRowIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      // j/k or down/up — move within column
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setRowIndex((prev) => {
          if (currentTasks.length === 0) return -1;
          return Math.min(prev + 1, currentTasks.length - 1);
        });
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setRowIndex((prev) => {
          if (currentTasks.length === 0) return -1;
          return Math.max(prev - 1, 0);
        });
        return;
      }

      // Enter — open task detail
      if (e.key === "Enter" && selectedTask) {
        e.preventDefault();
        onOpenTask(selectedTask);
        return;
      }

      // m — move task
      if (e.key === "m" && selectedTask) {
        e.preventDefault();
        onMoveTask(selectedTask);
        return;
      }
    },
    [enabled, currentTasks, selectedTask, onOpenTask, onMoveTask],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { colIndex, rowIndex, selectedTask, selectedCardId: selectedTask?.id ?? null };
}
