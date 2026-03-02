import type { Timestamp } from "./common";

export type TaskStatus = "backlog" | "in_progress" | "in_review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string | null;
  order: number;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
