import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Project } from "@/types/project";

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: () => Project | undefined;
  createProject: (name: string, description: string) => Project;
  updateProject: (id: string, updates: Partial<Pick<Project, "name" | "description">>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,

  activeProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId);
  },

  createProject: (name, description) => {
    const now = Date.now();
    const project: Project = {
      id: nanoid(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id,
    }));
    return project;
  },

  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
      ),
    })),

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
    })),

  setActiveProject: (id) => set({ activeProjectId: id }),
}));
