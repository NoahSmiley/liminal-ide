import { WelcomeScreen } from "./welcome-screen";
import { ConversationStream } from "../conversation/conversation-stream";
import { EditorPane } from "../file-viewer/editor-pane";
import { FilePreviewPanel } from "../file-viewer/file-preview-panel";
import type { MainView } from "../../stores/ui-store";
import type { Project } from "../../types/project-types";
import type { Message } from "../../types/session-types";
import type { FilePreview } from "../../hooks/use-ai-file-stream";
import type { FileBuffer } from "../../hooks/use-open-files";
import type { FileChange } from "../../types/change-types";
import type { Extension } from "@codemirror/state";

interface TurnReviewData {
  turnId: string;
  changes: FileChange[];
}

interface AppShellContentProps {
  mainView: MainView;
  project: Project | null;
  messages: Message[];
  streaming: boolean;
  pending: boolean;
  livePreview: FilePreview | null;
  fc: {
    files: Map<string, FileBuffer>;
    active: FileBuffer | null;
    activeFile: string | null;
    saving: boolean;
    setActiveFile: (f: string) => void;
    closeFile: (f: string) => void;
    updateBuffer: (f: string, b: string) => void;
    saveFile: (path: string) => Promise<void>;
  };
  lspExtensions: Extension[];
  changeReview: {
    turns: TurnReviewData[];
    acceptFile: (turnId: string, path: string) => void;
    rejectFile: (turnId: string, path: string) => void;
    acceptAllFiles: (turnId: string) => void;
    rejectAllFiles: (turnId: string) => void;
  };
  lint: { result: { success: boolean; output: string; command: string } | null; running: boolean; dismiss: () => void };
  setMainView: (v: MainView) => void;
  openFileInEditor: (path: string) => void;
  handleInput: (input: string) => void;
  handleCommand: (cmd: string, args: string) => void;
  onTutorial: () => void;
}

export function AppShellContent(props: AppShellContentProps) {
  const { mainView, project, messages, streaming, pending, livePreview, fc, lspExtensions, changeReview, lint, setMainView, openFileInEditor, handleInput, handleCommand, onTutorial } = props;

  if (mainView === "editor" && fc.active) {
    return (
      <EditorPane
        files={fc.files} active={fc.active} activeFile={fc.activeFile} saving={fc.saving}
        extensions={lspExtensions} onSelect={fc.setActiveFile} onClose={fc.closeFile}
        onChange={fc.updateBuffer} onSave={fc.saveFile} onBack={() => setMainView("chat")}
      />
    );
  }
  if (!project && messages.length === 0) return <WelcomeScreen onCommand={handleCommand} onTutorial={onTutorial} />;
  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4">
        {messages.length > 0 ? (
          <ConversationStream
            messages={messages} streaming={streaming} pending={pending}
            turnReviews={changeReview.turns} lint={lint.result} lintRunning={lint.running}
            onOpenFile={openFileInEditor}
            onAcceptFile={changeReview.acceptFile}
            onRejectFile={changeReview.rejectFile}
            onAcceptAll={changeReview.acceptAllFiles}
            onRejectAll={changeReview.rejectAllFiles}
            onDismissLint={lint.dismiss}
            onSendToAi={(prompt: string) => handleInput(prompt)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-700 text-[12px]">type below to start</div>
        )}
      </div>
      {livePreview && (
        <div className="shrink-0 h-full" style={{ width: "min(30%, 360px)" }}>
          <FilePreviewPanel preview={livePreview} />
        </div>
      )}
    </div>
  );
}
