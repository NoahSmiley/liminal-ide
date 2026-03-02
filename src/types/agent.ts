export type AgentRole = "pm" | "designer" | "architect" | "developer" | "qa" | "devops";

export type AgentStatus = "idle" | "working" | "reviewing" | "offline";

export interface AgentPersonality {
  tone: string;
  greeting: string;
  expertise: string[];
  quirk: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  color: string;
  personality: AgentPersonality;
  status: AgentStatus;
}
