import { useState, useRef, useCallback, useEffect } from "react";
import { WelcomeScreen } from "./welcome-screen";
import { ConversationStream } from "../conversation/conversation-stream";
import { EditorPane } from "../file-viewer/editor-pane";
import { FilePreviewPanel } from "../file-viewer/file-preview-panel";
import { TerminalTabs } from "../terminal-output/terminal-tabs";
import { SettingsPanel } from "./settings-panel";
import { WebPreviewPane } from "./web-preview-pane";
import { PairingPanel } from "./pairing-panel";
import { GuidedView } from "../guided/guided-view";
import type { MainView } from "../../stores/ui-store";
import type { Project } from "../../types/project-types";
import type { Message } from "../../types/session-types";
import type { FilePreview } from "../../hooks/use-ai-file-stream";
import type { FileBuffer } from "../../hooks/use-open-files";
import type { FileChange } from "../../types/change-types";
import type { Settings } from "../../types/settings-types";
import type { Extension } from "@codemirror/state";
import type { Breakpoint } from "../../types/debug-types";
import type { RemoteCursor } from "../../types/collab-types";
import type { AgentTemplate } from "../../types/agent-types";
import type { Skill } from "../../types/skill-types";
import type { GuidedSession, GuidedStep } from "../../types/guided-types";

interface GuidedProps {
  session: GuidedSession | null;
  currentStep: GuidedStep | null;
  visibleContent: string;
  animationDone: boolean;
  goNext: () => void;
  goPrev: () => void;
  skipAnimation: () => void;
  acceptCurrent: () => void;
  rejectCurrent: () => void;
  acceptAllRemaining: () => void;
  dismiss: () => void;
}

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
  breakpoints: Breakpoint[];
  onToggleBreakpoint: (path: string, line: number) => void;
  collabCursors: RemoteCursor[];
  collabSendCursorUpdate?: (file: string, line: number, col: number) => void;
  terminal: { output: string; exited: boolean; exitCode: number | null; pendingError: string | null; onAcceptInterpret: () => void; onDismissInterpret: () => void; onPinOutput: (c: string) => void };
  multiTerminal: { terminalIds: string[]; activeTerminal: string | null; onSpawn: () => void; onKill: (id: string) => void; onSelect: (id: string) => void; onSendInput: (id: string, input: string) => void };
  settings: { settings: Settings | null; update: (s: Partial<Settings>) => void; reset: () => void };
  previewUrl: string | null;
  previewLive: boolean;
  onPreviewUrlChange: (url: string | null) => void;
  onGeneratePairingQR: () => Promise<import("../../hooks/use-relay").PairingQR | null>;
  agents?: { agents: AgentTemplate[]; active: AgentTemplate | null; activate: (t: AgentTemplate | null) => void; save: (t: AgentTemplate) => void; remove: (id: string) => void; refresh: () => void };
  skills?: { skills: Skill[]; refresh: () => void };
  guided?: GuidedProps;
}

function TerminalInput({ onSubmit }: { onSubmit: (input: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!value) return;
    onSubmit(value + "\n");
    setValue("");
  }, [value, onSubmit]);

  return (
    <div className="border-t border-zinc-800/40 px-3 py-2 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 shrink-0">$</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="flex-1 bg-transparent text-zinc-300 text-[11px] font-mono outline-none placeholder:text-zinc-700 caret-cyan-400"
          placeholder="type command..."
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

function TerminalView({ terminal, multiTerminal }: Pick<AppShellContentProps, "terminal" | "multiTerminal">) {
  const outputRef = useRef<HTMLDivElement>(null);
  const hasSpawnedRef = useRef(false);

  // Auto-spawn a terminal only on first mount if none exist
  useEffect(() => {
    if (!hasSpawnedRef.current && multiTerminal.terminalIds.length === 0) {
      hasSpawnedRef.current = true;
      multiTerminal.onSpawn();
    }
  }, [multiTerminal.terminalIds.length, multiTerminal.onSpawn]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminal.output]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TerminalTabs terminalIds={multiTerminal.terminalIds} activeTerminal={multiTerminal.activeTerminal}
        onSelect={multiTerminal.onSelect} onClose={multiTerminal.onKill} onNew={multiTerminal.onSpawn} />
      <div ref={outputRef} className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px]">
        <pre className="text-zinc-400 whitespace-pre-wrap">{terminal.output}</pre>
        {terminal.exited && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] ${terminal.exitCode === 0 ? "text-sky-500" : "text-red-400"}`}>
              process exited with code {terminal.exitCode}
            </span>
            {terminal.output && (
              <button
                onClick={() => terminal.onPinOutput(terminal.output.slice(-2000))}
                className="text-[10px] text-zinc-600 hover:text-cyan-400 underline"
              >
                pin output
              </button>
            )}
          </div>
        )}
        {terminal.pendingError && (
          <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-400">
            <span>command failed -- interpret?</span>
            <button onClick={terminal.onAcceptInterpret} className="text-cyan-400 hover:text-cyan-300 underline">y</button>
            <button onClick={terminal.onDismissInterpret} className="text-zinc-500 hover:text-zinc-400 underline">n</button>
          </div>
        )}
      </div>
      {multiTerminal.activeTerminal && !terminal.exited && (
        <TerminalInput onSubmit={(input) => multiTerminal.onSendInput(multiTerminal.activeTerminal!, input)} />
      )}
    </div>
  );
}

export function AppShellContent(props: AppShellContentProps) {
  const { mainView, project, messages, streaming, pending, livePreview, fc, lspExtensions, changeReview, lint, setMainView, openFileInEditor, handleInput, handleCommand, onTutorial, breakpoints, onToggleBreakpoint, collabCursors, collabSendCursorUpdate, terminal, multiTerminal, settings, previewUrl, previewLive, onPreviewUrlChange, onGeneratePairingQR } = props;

  if (mainView === "settings" && settings.settings) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <SettingsPanel settings={settings.settings} onUpdate={settings.update} onReset={settings.reset}
          agents={props.agents} skills={props.skills} />
      </div>
    );
  }

  if (mainView === "preview") {
    return (
      <WebPreviewPane url={previewUrl} onUrlChange={onPreviewUrlChange} />
    );
  }

  if (mainView === "pair") {
    return (
      <PairingPanel onGenerateQR={onGeneratePairingQR} />
    );
  }

  if (mainView === "guided" && props.guided) {
    return <GuidedView {...props.guided} />;
  }

  if (mainView === "terminal") {
    return (
      <TerminalView terminal={terminal} multiTerminal={multiTerminal} />
    );
  }

  if (mainView === "editor" && fc.active) {
    return (
      <EditorPane
        files={fc.files} active={fc.active} activeFile={fc.activeFile} saving={fc.saving}
        extensions={lspExtensions} onSelect={fc.setActiveFile} onClose={fc.closeFile}
        onChange={fc.updateBuffer} onSave={fc.saveFile} onBack={() => setMainView("chat")}
        breakpoints={breakpoints} onToggleBreakpoint={onToggleBreakpoint}
        collabCursors={collabCursors} collabSendCursorUpdate={collabSendCursorUpdate}
      />
    );
  }
  if (!project && messages.length === 0) return <WelcomeScreen onCommand={handleCommand} onTutorial={onTutorial} />;
  return (
    <div className="flex-1 relative min-h-0">
      <div className="absolute inset-0 overflow-y-auto px-4 py-4">
        {messages.length > 0 ? (
          <>
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
            {previewLive && previewUrl && (
              <button
                onClick={() => setMainView("preview")}
                className="flex items-center gap-2 mt-3 mb-1 px-3 py-1.5 rounded-[3px] border border-cyan-500/20 text-[11px] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>open preview</span>
                <span className="text-cyan-600 font-mono">{previewUrl}</span>
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-700 text-[11px]">type below to start</div>
        )}
      </div>
      {livePreview && (
        <div className="absolute bottom-3 right-3 w-[320px] h-[220px] rounded-[4px] border border-zinc-700/60 bg-zinc-950 shadow-xl shadow-black/60 overflow-hidden z-10">
          <FilePreviewPanel preview={livePreview} />
        </div>
      )}
    </div>
  );
}
