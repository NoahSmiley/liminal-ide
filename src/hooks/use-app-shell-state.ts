import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project, ProjectSummary } from "../types/project-types";
import type { Message } from "../types/session-types";

export function useAppShellState() {
  const [project, setProject] = useState<Project | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [claudeAvailable, setClaudeAvailable] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  const refreshProjects = useCallback(() => {
    invoke<ProjectSummary[]>("list_projects").then(setProjects).catch(() => {});
  }, []);

  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  return {
    project, setProject, sessionId, setSessionId,
    claudeAvailable, setClaudeAvailable, terminalId, setTerminalId,
    projects, refreshProjects, initialMessages, setInitialMessages,
  };
}
