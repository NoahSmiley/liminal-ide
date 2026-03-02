import { useBoardStore } from "@/stores/boardStore";
import { useAgentStore } from "@/stores/agentStore";
import type { TaskStatus } from "@/types/board";
import { toast } from "sonner";
import { AGENT_MAP } from "@/data/agents";

const STATUS_PROGRESSION: TaskStatus[] = [
  "backlog",
  "in_progress",
  "in_review",
  "done",
];

function getNextStatus(current: TaskStatus): TaskStatus | null {
  const idx = STATUS_PROGRESSION.indexOf(current);
  if (idx === -1 || idx >= STATUS_PROGRESSION.length - 1) return null;
  return STATUS_PROGRESSION[idx + 1] ?? null;
}

// Creates tasks from a PM-like breakdown
export function createTasksFromPrompt(projectId: string, prompt: string) {
  const boardStore = useBoardStore.getState();
  const keywords = prompt.toLowerCase();

  const taskTemplates = [
    {
      match: () => true, // PM always creates a planning task
      title: `Define requirements for: ${prompt.slice(0, 50)}`,
      agent: "sage",
      priority: "high" as const,
      tags: ["planning"],
    },
    {
      match: () => keywords.includes("ui") || keywords.includes("design") || keywords.includes("page"),
      title: "Design UI mockups",
      agent: "pixel",
      priority: "medium" as const,
      tags: ["design"],
    },
    {
      match: () => keywords.includes("api") || keywords.includes("database") || keywords.includes("backend"),
      title: "Design system architecture",
      agent: "atlas",
      priority: "high" as const,
      tags: ["architecture"],
    },
    {
      match: () => true, // Dev always has implementation
      title: `Implement: ${prompt.slice(0, 40)}`,
      agent: "forge",
      priority: "medium" as const,
      tags: ["implementation"],
    },
    {
      match: () => true, // QA always has tests
      title: "Write test cases",
      agent: "scout",
      priority: "medium" as const,
      tags: ["testing"],
    },
    {
      match: () => keywords.includes("deploy") || keywords.includes("production") || keywords.includes("launch"),
      title: "Set up deployment pipeline",
      agent: "beacon",
      priority: "low" as const,
      tags: ["devops"],
    },
  ];

  const created: string[] = [];
  for (const template of taskTemplates) {
    if (template.match()) {
      const task = boardStore.addTask({
        projectId,
        title: template.title,
        description: `Auto-generated from prompt: "${prompt}"`,
        status: "backlog",
        priority: template.priority,
        assignedAgentId: template.agent,
        tags: template.tags,
      });
      created.push(task.id);

      const agent = AGENT_MAP[template.agent];
      if (agent) {
        toast(`${agent.name} picked up: ${template.title}`, {
          description: `Added to backlog`,
        });
      }
    }
  }

  return created;
}

// Auto-progress tasks through the pipeline
export function startTaskProgression(taskId: string) {
  const interval = 4000 + Math.random() * 6000; // 4-10s per stage

  const timer = setTimeout(function progressTask() {
    const task = useBoardStore.getState().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextStatus = getNextStatus(task.status);
    if (!nextStatus) return;

    // Update task status
    useBoardStore.getState().moveTask(taskId, nextStatus, 0);

    // Update agent status
    if (task.assignedAgentId) {
      const agentStore = useAgentStore.getState();
      if (nextStatus === "in_progress") {
        agentStore.setAgentStatus(task.assignedAgentId, "working");
      } else if (nextStatus === "in_review") {
        agentStore.setAgentStatus(task.assignedAgentId, "reviewing");
      } else if (nextStatus === "done") {
        agentStore.setAgentStatus(task.assignedAgentId, "idle");
      }

      const agent = AGENT_MAP[task.assignedAgentId];
      if (agent) {
        toast(`${agent.name} moved task to ${nextStatus.replace("_", " ")}`, {
          description: task.title,
        });
      }
    }

    // Continue progressing
    if (nextStatus !== "done") {
      const nextInterval = 4000 + Math.random() * 6000;
      setTimeout(progressTask, nextInterval);
    }
  }, interval);

  return () => clearTimeout(timer);
}
