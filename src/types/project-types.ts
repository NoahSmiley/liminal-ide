export interface Project {
  id: string;
  name: string;
  root_path: string;
  workspace?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  root_path: string;
  workspace?: string | null;
}
