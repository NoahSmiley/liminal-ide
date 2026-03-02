import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

export function WelcomePage() {
  const navigate = useNavigate();
  const openModal = useUIStore((s) => s.openModal);
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const visibleProjects = projects.slice(0, 5);

  const handleSelect = useCallback(
    (index: number) => {
      const project = visibleProjects[index];
      if (project) {
        setActiveProject(project.id);
        navigate(`/project/${project.id}`);
      }
    },
    [visibleProjects, setActiveProject, navigate],
  );

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: visibleProjects.length,
    onSelect: handleSelect,
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <pre className="text-[10px] text-muted-foreground leading-relaxed">
{`  _ _       _            _
 | (_)_ __ (_)_ __  __ _| |
 | | | '  \\| | '  \\/ _' | |
 |_|_|_|_|_|_|_|_|_\\__,_|_|`}
      </pre>

      {visibleProjects.length > 0 && (
        <div className="space-y-0 text-[10px] border border-panel-border p-2">
          {visibleProjects.map((project, i) => {
            const slug = project.name.toLowerCase().replace(/\s+/g, "-");
            return (
              <button
                key={project.id}
                data-kb-selected={i === selectedIndex}
                onClick={() => {
                  setActiveProject(project.id);
                  navigate(`/project/${project.id}`);
                }}
                className="block text-muted-foreground py-0.5 px-1"
              >
                $ cd {slug}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => openModal("new-project")}
        className="text-[10px] text-muted-foreground border border-panel-border px-2 py-0.5"
      >
        $ liminal init
      </button>

      <span className="text-[10px] text-muted-foreground/30">
        <kbd className="border border-panel-border px-1 py-0">⌘K</kbd> navigate{" "}
        <kbd className="border border-panel-border px-1 py-0 ml-1">:</kbd> terminal
      </span>
    </div>
  );
}
