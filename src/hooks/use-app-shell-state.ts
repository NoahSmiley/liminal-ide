import { useState } from "react";
import type { Project } from "../types/project-types";

export function useAppShellState() {
  const [project, setProject] = useState<Project | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [claudeAvailable, setClaudeAvailable] = useState(false);
  const [terminalId, setTerminalId] = useState<string | null>(null);

  return { project, setProject, sessionId, setSessionId, claudeAvailable, setClaudeAvailable, terminalId, setTerminalId };
}
