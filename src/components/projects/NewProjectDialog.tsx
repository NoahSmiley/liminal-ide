import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";

export function NewProjectDialog() {
  const navigate = useNavigate();
  const { activeModal, closeModal } = useUIStore();
  const createProject = useProjectStore((s) => s.createProject);
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");

  const open = activeModal === "new-project";

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const project = createProject(name.trim(), "");
    setName("");
    closeModal();
    navigate(`/project/${project.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20%] bg-background/80" onClick={closeModal}>
      <div className="w-full max-w-md border border-panel-border bg-background p-0" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          $ init project
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">name &gt;</span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="project name"
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
        <div className="flex items-center border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground/30">
          enter create · esc cancel
        </div>
      </div>
    </div>
  );
}
