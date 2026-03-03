import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PluginManifest } from "../types/plugin-types";

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<PluginManifest[]>("list_plugins");
      setPlugins(result);
    } catch (err) {
      console.error("Failed to load plugins:", err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runCommand = useCallback(async (pluginName: string, commandName: string): Promise<string> => {
    const result = await invoke<string>("run_plugin_command", {
      pluginName,
      commandName,
    });
    return result;
  }, []);

  return { plugins, refresh, runCommand };
}
