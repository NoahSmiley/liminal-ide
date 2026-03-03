import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTauriEvent } from "./use-tauri-event";
import type { Settings } from "../types/settings-types";

interface AppEvent {
  type: "Settings";
  payload: { kind: "Updated"; settings: Settings };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<Settings>("get_settings")
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setLoading(false));
  }, []);

  useTauriEvent<AppEvent>("settings:event", (event) => {
    if (event.payload.kind === "Updated") {
      setSettings(event.payload.settings);
    }
  });

  const update = useCallback(async (partial: Partial<Settings>) => {
    if (!settings) return;
    const merged = { ...settings, ...partial };
    try {
      const updated = await invoke<Settings>("update_settings", { settings: merged });
      setSettings(updated);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  }, [settings]);

  const reset = useCallback(async () => {
    try {
      const defaults = await invoke<Settings>("reset_settings");
      setSettings(defaults);
    } catch (err) {
      console.error("Failed to reset settings:", err);
    }
  }, []);

  return { settings, loading, update, reset };
}
