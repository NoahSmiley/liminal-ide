export interface SubagentEntry {
  id: string;
  toolName: string;
  description: string;
  status: "running" | "completed";
  toolIds: string[];
}
