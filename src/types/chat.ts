import type { Timestamp } from "./common";

export type ChatTarget =
  | { type: "team" }
  | { type: "agent"; agentId: string };

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  agentId: string | null;
  content: string;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  projectId: string;
  target: ChatTarget;
  messages: ChatMessage[];
}
