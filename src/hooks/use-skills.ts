import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Skill } from "../types/skill-types";

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await invoke<Skill[]>("list_skills");
      setSkills(result);
    } catch {
      setSkills([]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { skills, refresh };
}
