import { useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { TuiPanel } from "@/components/shared/TuiPanel";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export function ProjectSettingsPage() {
  const { id } = useParams();
  const { projects, updateProject } = useProjectStore();
  const project = projects.find((p) => p.id === id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
    }
  }, [project]);

  const handleSave = useCallback(() => {
    if (!project) return;
    updateProject(project.id, { name, description });
    toast.success("settings saved");
  }, [project, name, description, updateProject]);

  useEffect(() => {
    const handler = () => handleSave();
    document.addEventListener("liminal:save", handler);
    return () => document.removeEventListener("liminal:save", handler);
  }, [handleSave]);

  if (!project) return null;

  return (
    <div className="flex h-full flex-col p-1">
      <div className="px-1 pb-1">
        <span className="text-[10px] text-muted-foreground">
          SETTINGS
          <span className="text-muted-foreground/30 ml-2">[⌘s]save</span>
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-lg space-y-1 p-0.5">
          <TuiPanel title="name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              className="w-full bg-transparent text-xs text-foreground outline-none"
            />
          </TuiPanel>
          <TuiPanel title="description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              spellCheck={false}
              rows={3}
              className="w-full bg-transparent text-xs text-foreground outline-none resize-none"
            />
          </TuiPanel>
          <div className="pt-1">
            <button
              onClick={handleSave}
              className="text-[10px] text-muted-foreground border border-panel-border px-2 py-0.5"
            >
              save [⌘s]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
