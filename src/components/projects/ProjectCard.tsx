import { useNavigate } from "react-router-dom";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  className?: string;
}

export function ProjectCard({ project, isActive, className }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/project/${project.id}`)}
      className={cn(
        "w-full border-l-2 border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary/50",
        isActive && "border-primary/50",
        className,
      )}
    >
      <h3 className="font-medium text-foreground">{project.name}</h3>
      {project.description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>
      )}
    </button>
  );
}
