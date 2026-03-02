import type { AgentRole } from "@/types/agent";

// The order agents work on tasks: PM breaks it down, Designer designs, etc.
export const PIPELINE_ORDER: AgentRole[] = [
  "pm",
  "designer",
  "architect",
  "developer",
  "qa",
  "devops",
];

// Map from role to agent ID
export const ROLE_TO_AGENT: Record<AgentRole, string> = {
  pm: "sage",
  designer: "pixel",
  architect: "atlas",
  developer: "forge",
  qa: "scout",
  devops: "beacon",
};

export function getNextRole(currentRole: AgentRole): AgentRole | null {
  const idx = PIPELINE_ORDER.indexOf(currentRole);
  if (idx === -1 || idx >= PIPELINE_ORDER.length - 1) return null;
  return PIPELINE_ORDER[idx + 1] ?? null;
}
