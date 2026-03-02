import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { useUIStore } from "@/stores/uiStore";

export interface Command {
  id: string;
  group: "nav" | "projects" | "agents" | "actions";
  label: string;
  keywords: string[];
  shortcut?: string;
  action: () => void;
}

export function useCommands(): Command[] {
  const location = useLocation();
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const agents = useAgentStore((s) => s.agents);

  return useMemo(() => {
    const commands: Command[] = [];

    // Extract projectId from current path
    const match = location.pathname.match(/\/project\/([^/]+)/);
    const projectId = match?.[1] ?? null;

    // Nav commands — only when a project is active
    if (projectId) {
      commands.push(
        {
          id: "nav-dashboard",
          group: "nav",
          label: "dashboard",
          keywords: ["home", "overview", "project"],
          action: () => navigate(`/project/${projectId}`),
        },
        {
          id: "nav-board",
          group: "nav",
          label: "board",
          keywords: ["kanban", "tasks", "cards"],
          action: () => navigate(`/project/${projectId}/board`),
        },
        {
          id: "nav-agents",
          group: "nav",
          label: "agents",
          keywords: ["team", "ai", "bots"],
          action: () => navigate(`/project/${projectId}/agents`),
        },
        {
          id: "nav-chat",
          group: "nav",
          label: "chat",
          keywords: ["message", "talk", "conversation"],
          action: () => navigate(`/project/${projectId}/chat`),
        },
        {
          id: "nav-settings",
          group: "nav",
          label: "settings",
          keywords: ["config", "preferences", "options"],
          action: () => navigate(`/project/${projectId}/settings`),
        },
      );
    }

    // Project commands
    for (const project of projects) {
      const slug = project.name.toLowerCase().replace(/\s+/g, "-");
      commands.push({
        id: `project-${project.id}`,
        group: "projects",
        label: slug,
        keywords: [project.name, "project", "switch"],
        action: () => {
          setActiveProject(project.id);
          navigate(`/project/${project.id}`);
        },
      });
    }

    // Agent commands — only when a project is active
    if (projectId) {
      for (const agent of agents) {
        commands.push({
          id: `agent-${agent.id}`,
          group: "agents",
          label: agent.name.toLowerCase(),
          keywords: [agent.role, "agent", "chat"],
          action: () => navigate(`/project/${projectId}/chat/${agent.id}`),
        });
      }
    }

    // Action commands
    if (projectId) {
      commands.push({
        id: "action-new-task",
        group: "actions",
        label: "new task",
        keywords: ["create", "add", "task"],
        shortcut: "n",
        action: () => useUIStore.getState().openModal("new-task"),
      });
    }
    commands.push(
      {
        id: "action-new-project",
        group: "actions",
        label: "new project",
        keywords: ["create", "init", "add"],
        shortcut: projectId ? undefined : "n",
        action: () => useUIStore.getState().openModal("new-project"),
      },
      {
        id: "action-home",
        group: "actions",
        label: "home",
        keywords: ["welcome", "start", "root"],
        action: () => navigate("/"),
      },
      {
        id: "action-shortcuts",
        group: "actions",
        label: "keyboard shortcuts",
        keywords: ["help", "keys", "hotkeys"],
        shortcut: "?",
        action: () => useUIStore.getState().openShortcutHelp(),
      },
      {
        id: "action-hacker-mode",
        group: "actions",
        label: "toggle hacker mode",
        keywords: ["keyboard", "mouse", "pointer", "hacker"],
        action: () => useUIStore.getState().toggleHackerMode(),
      },
    );

    return commands;
  }, [location.pathname, projects, agents, navigate, setActiveProject]);
}
