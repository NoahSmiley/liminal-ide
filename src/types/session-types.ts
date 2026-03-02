export type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  project_id: string;
  messages: Message[];
}

export interface SessionSummary {
  id: string;
  project_id: string;
  message_count: number;
  preview: string;
}
