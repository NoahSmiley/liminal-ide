import type { Project } from "@/types/project";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "demo-project",
    name: "TaskFlow App",
    description: "A modern task management app with real-time collaboration",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000,
  },
];
