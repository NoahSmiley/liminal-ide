import type { TaskStatus } from "@/types/board";

interface KanbanColumnHeaderProps {
  status: TaskStatus;
  count: number;
}

const COLUMN_LABELS: Record<TaskStatus, string> = {
  backlog: "BACKLOG",
  in_progress: "IN_PROGRESS",
  in_review: "IN_REVIEW",
  done: "DONE",
};

export function KanbanColumnHeader({ status, count }: KanbanColumnHeaderProps) {
  return (
    <div className="px-1 pb-1">
      <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {COLUMN_LABELS[status]}{" "}
        <span className="text-foreground">[{count}]</span>
      </h3>
    </div>
  );
}
