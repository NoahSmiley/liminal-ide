import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TreeNode } from "../../types/fs-types";
import type { TodoItem } from "../../types/todo-types";
import type { StackFrame } from "../../types/debug-types";
import { StatusBar } from "./status-bar";
import { InputBar } from "./input-bar";
import { PanelControlBar } from "./panel-control-bar";
import { FileTreePanel } from "../file-viewer/file-tree-panel";
import { PinnedChips } from "../conversation/pinned-chips";
import { ResizeHandle } from "../shared/resize-handle";
import { AppPanels } from "./app-panels";
import { AppShellContent } from "./app-shell-content";
import { useConversation } from "../../hooks/use-conversation";
import { useFileTree } from "../../hooks/use-file-tree";
import { useOpenFiles } from "../../hooks/use-open-files";
import { useAiFileStream } from "../../hooks/use-ai-file-stream";
import { useTerminal } from "../../hooks/use-terminal";
import { useCommands } from "../../hooks/use-commands";
import { usePanelCommands } from "../../hooks/use-panel-commands";
import { useInputHandler } from "../../hooks/use-input-handler";
import { useErrorInterpret } from "../../hooks/use-error-interpret";
import { useChangeReview } from "../../hooks/use-change-review";
import { usePinnedContext } from "../../hooks/use-pinned-context";
import { useLint } from "../../hooks/use-lint";
import { useUiStore } from "../../stores/ui-store";
import { useLsp } from "../../hooks/use-lsp";
import { useLspExtensions } from "../../hooks/use-lsp-extensions";
import { useAppShellKeys } from "../../hooks/use-app-shell-keys";
import { useAppShellState } from "../../hooks/use-app-shell-state";
import { useSettings } from "../../hooks/use-settings";
import { useSearch } from "../../hooks/use-search";
import { useTodos } from "../../hooks/use-todos";
import { useSnippets } from "../../hooks/use-snippets";
import { usePlugins } from "../../hooks/use-plugins";
import { useDebugger } from "../../hooks/use-debugger";
import { useCollab } from "../../hooks/use-collab";
import { useGit } from "../../hooks/use-git";
import { useTutorial } from "../../hooks/use-tutorial";
import { TutorialOverlay } from "../tutorial/tutorial-overlay";

export function AppShell() {
  const s = useAppShellState();
  const conv = useConversation(s.sessionId);
  const { nodes, refresh, expandDir } = useFileTree();
  const fc = useOpenFiles();
  const terminal = useTerminal(s.terminalId);
  const ui = useUiStore();
  const settingsHook = useSettings();
  const searchHook = useSearch();
  const todosHook = useTodos();
  const snippetsHook = useSnippets();
  const pluginsHook = usePlugins();
  const debugHook = useDebugger();
  const collabHook = useCollab();
  const gitHook = useGit();
  const tutorial = useTutorial();
  const { previews } = useAiFileStream({});
  const { diagnostics, servers } = useLsp(fc.active?.path ?? null, fc.active?.buffer ?? undefined);
  const lspExtensions = useLspExtensions(servers, fc.active?.path ?? null, diagnostics);
  const errorInterpret = useErrorInterpret({ sessionId: s.sessionId, addUserMessage: conv.addUserMessage, markPending: conv.markPending });
  const changeReview = useChangeReview(s.sessionId);
  const pinnedCtx = usePinnedContext();
  const lint = useLint();

  useEffect(() => {
    if (terminal.exited && terminal.exitCode !== null && terminal.exitCode !== 0)
      errorInterpret.offerInterpretation(terminal.output, terminal.exitCode);
  }, [terminal.exited, terminal.exitCode]);
  useEffect(() => { if (s.project) gitHook.refreshStatus(); }, [s.project]);
  useEffect(() => { invoke<boolean>("check_claude_status").then(s.setClaudeAvailable).catch(() => s.setClaudeAvailable(false)); }, []);

  const panelCmd = usePanelCommands({
    toggleSearch: ui.toggleSearch, toggleGit: ui.toggleGit, toggleTodos: ui.toggleTodos,
    toggleSnippets: ui.toggleSnippets, togglePlugins: ui.togglePlugins, toggleDebug: ui.toggleDebug,
    addUserMessage: conv.addUserMessage, collabCreate: collabHook.createRoom, collabJoin: collabHook.joinRoom,
  });
  const handleCommand = useCommands({
    setProject: s.setProject, setSessionId: s.setSessionId, addUserMessage: conv.addUserMessage, refresh,
    toggleFileTree: ui.toggleFileTree, openFileTree: ui.openFileTree, toggleTerminal: ui.toggleTerminal,
    currentFilePath: fc.active?.path ?? null, sessionId: s.sessionId, markPending: conv.markPending,
    onPanelCommand: panelCmd, toggleTutorial: tutorial.toggle,
  });
  const closeActiveFile = useCallback(() => { if (fc.activeFile) fc.closeFile(fc.activeFile); }, [fc]);
  useAppShellKeys({ streaming: conv.streaming, toggleFileTree: ui.toggleFileTree, toggleTerminal: ui.toggleTerminal, toggleMainView: ui.toggleMainView, refresh, closeActiveFile, toggleSearch: ui.toggleSearch });

  const openFileInEditor = useCallback((path: string) => { fc.openFile(path); ui.setMainView("editor"); }, [fc, ui]);
  const openFileAt = useCallback((path: string, _line: number) => openFileInEditor(path), [openFileInEditor]);
  const handleFileSelect = useCallback((node: TreeNode) => { if (!node.is_dir) openFileInEditor(node.path); }, [openFileInEditor]);
  const handleInput = useInputHandler({
    sessionId: s.sessionId, terminalId: s.terminalId, terminalOpen: ui.panels.terminalOpen,
    addUserMessage: conv.addUserMessage, markPending: conv.markPending, handleCommand,
    toggleTerminal: ui.toggleTerminal, setTerminalId: s.setTerminalId,
  });
  const handleFixTodo = useCallback((item: TodoItem) => { handleInput(`fix the ${item.kind} at ${item.path}:${item.line_number}: ${item.text}`); }, [handleInput]);
  const handleSelectDebugFrame = useCallback((frame: StackFrame) => { if (frame.source_path) openFileAt(frame.source_path, frame.line); }, [openFileAt]);
  const [sidebarWidth, setSidebarWidth] = useState(192);
  const handleSidebarResize = useCallback((delta: number) => { setSidebarWidth((w) => Math.min(Math.max(w + delta, 120), Math.floor(window.innerWidth * 0.3))); }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 font-mono text-[13px]">
      <StatusBar projectName={s.project?.name ?? null} claudeAvailable={s.claudeAvailable}
        fileTreeOpen={ui.panels.fileTreeOpen} gitBranch={gitHook.status?.branch ?? null}
        collabStatus={collabHook.status} onToggleFileTree={() => { ui.toggleFileTree(); refresh(); }}
        onToggleSettings={ui.toggleSettings} onToggleTutorial={tutorial.toggle}
        onCollabShare={() => panelCmd("share", "")} onCollabLeave={collabHook.leave} />
      <div className="flex flex-1 min-h-0">
        {ui.panels.fileTreeOpen && (
          <>
            <aside style={{ width: sidebarWidth, maxWidth: "30vw" }} className="shrink-0 overflow-y-auto flex flex-col">
              <FileTreePanel nodes={nodes} onSelect={handleFileSelect} onExpand={expandDir}
                onCreateFile={(path: string) => fc.createFile(path)} onPinFile={pinnedCtx.pinFile} />
            </aside>
            <ResizeHandle onResize={handleSidebarResize} />
          </>
        )}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <PanelControlBar mainView={ui.mainView} terminalOpen={ui.panels.terminalOpen} onSetView={ui.setMainView} onToggleTerminal={ui.toggleTerminal} />
          <div className="flex-1 flex flex-col min-h-0">
            <AppShellContent mainView={ui.mainView} project={s.project} messages={conv.messages} streaming={conv.streaming}
              pending={conv.pending} previews={previews} fc={fc} lspExtensions={lspExtensions}
              changeReview={changeReview} lint={lint} setMainView={ui.setMainView}
              openFileInEditor={openFileInEditor} handleInput={handleInput} handleCommand={handleCommand}
              onTutorial={tutorial.toggle} />
          </div>
          <AppPanels panels={ui.panels} terminal={{ output: terminal.output, exited: terminal.exited, exitCode: terminal.exitCode, pendingError: errorInterpret.pendingError, onAcceptInterpret: errorInterpret.acceptInterpretation, onDismissInterpret: errorInterpret.dismissError, onPinOutput: (c) => pinnedCtx.pinText("terminal", c) }}
            settings={settingsHook} search={searchHook} todos={todosHook} snippets={snippetsHook}
            plugins={pluginsHook} debugSession={debugHook.session} debugActions={debugHook}
            onOpenFileAt={openFileAt} onInsertSnippet={() => {}} onFixTodoWithAi={handleFixTodo}
            onSelectDebugFrame={handleSelectDebugFrame} onClosePanel={ui.closePanel} onToggleSettings={ui.toggleSettings} />
          {!(ui.mainView === "editor" && fc.active) && (
            <>
              <PinnedChips pins={pinnedCtx.pins} onUnpin={pinnedCtx.unpin} />
              <InputBar onSubmit={handleInput} disabled={conv.streaming} />
            </>
          )}
        </main>
      </div>
      {tutorial.open && <TutorialOverlay tutorial={tutorial} />}
    </div>
  );
}
