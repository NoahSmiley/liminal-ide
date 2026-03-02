import { create } from "zustand";
import type { Agent, AgentStatus } from "@/types/agent";
import { AGENTS } from "@/data/agents";

interface AgentState {
  agents: Agent[];
  getAgent: (id: string) => Agent | undefined;
  setAgentStatus: (id: string, status: AgentStatus) => void;
  resetAllStatuses: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: AGENTS.map((a) => ({ ...a })),

  getAgent: (id) => get().agents.find((a) => a.id === id),

  setAgentStatus: (id, status) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)),
    })),

  resetAllStatuses: () =>
    set((s) => ({
      agents: s.agents.map((a) => ({ ...a, status: "idle" as const })),
    })),
}));
