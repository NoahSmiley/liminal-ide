export type Role = "user" | "assistant" | "tool" | "system";

export interface Message {
  role: Role;
  content: string;
  tool_name?: string;
  tool_id?: string;
  is_tool_activity?: boolean;
}

export interface Session {
  id: string;
  project_id: string | null;
  messages: Message[];
  cli_session_id?: string | null;
  updated_at?: number;
}

export interface SessionSummary {
  id: string;
  project_id: string | null;
  message_count: number;
  preview: string;
}
