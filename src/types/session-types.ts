export type Role = "user" | "assistant" | "tool";

export interface Message {
  role: Role;
  content: string;
  tool_name?: string;
  tool_id?: string;
  is_tool_activity?: boolean;
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
