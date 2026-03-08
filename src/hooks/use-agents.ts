import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AgentTemplate } from "../types/agent-types";
import { PREMADE_AGENTS } from "../types/agent-types";

const DEFAULT_AGENT = PREMADE_AGENTS[0]!; // LIMINAL

export function useAgents() {
  const [agents, setAgents] = useState<AgentTemplate[]>([]);
  const [active, setActive] = useState<AgentTemplate | null>(DEFAULT_AGENT);

  const refresh = useCallback(async () => {
    try {
      const [list, current] = await Promise.all([
        invoke<AgentTemplate[]>("list_agents"),
        invoke<AgentTemplate | null>("get_active_agent"),
      ]);
      setAgents(list);
      // If nothing is active on the backend, default to LIMINAL
      setActive(current ?? DEFAULT_AGENT);
    } catch {
      setAgents([]);
      setActive(DEFAULT_AGENT);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-activate LIMINAL on first load if backend has no active agent
  useEffect(() => {
    invoke<AgentTemplate | null>("get_active_agent").then((current) => {
      if (!current) {
        invoke("set_active_agent", { template: DEFAULT_AGENT }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const activate = useCallback(async (template: AgentTemplate | null) => {
    const t = template ?? DEFAULT_AGENT;
    await invoke("set_active_agent", { template: t });
    setActive(t);
  }, []);

  const save = useCallback(async (template: AgentTemplate) => {
    await invoke("save_agent", { template });
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    if (id === DEFAULT_AGENT.id) return; // can't remove LIMINAL
    await invoke("delete_agent", { id });
    if (active?.id === id) {
      await activate(DEFAULT_AGENT);
    }
    await refresh();
  }, [refresh, active, activate]);

  return { agents, active, activate, save, remove, refresh };
}
