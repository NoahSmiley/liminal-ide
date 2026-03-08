import type { MainView } from "../../stores/ui-store";
import type { ProjectSummary } from "../../types/project-types";
import brainLogo from "../../assets/lightbrain.png";

interface StatusBarProps {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  claudeAvailable: boolean;
  gitBranch: string | null;
  mainView: MainView;
  hasEditorFiles: boolean;
  onGoHome: () => void;
  onSwitchProject: (id: string) => void;
  onSetView: (view: MainView) => void;
}

export function StatusBar({
  onGoHome,
}: StatusBarProps) {
  return (
    <div data-tauri-drag-region data-tutorial="status-bar"
      className="flex items-center justify-center pl-[50px] pr-5 h-[38px] border-b border-border/60 bg-background">
      <button
        onClick={onGoHome}
        title="home"
        className="opacity-40 hover:opacity-70 transition-opacity"
      >
        <img src={brainLogo} alt="home" width={20} height={20} className="select-none" draggable={false} />
      </button>
    </div>
  );
}
