import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { StatusBar } from "./status-bar";
import { InputBar } from "./input-bar";
import { PanelControlBar } from "./panel-control-bar";
import { FileTreePanel } from "../file-viewer/file-tree-panel";
import { PinnedChips } from "../conversation/pinned-chips";
import { ResizeHandle } from "../shared/resize-handle";
import { AppPanels } from "./app-panels";
import { AppShellContent } from "./app-shell-content";
import { QuickSwitch } from "./quick-switch";
import { TutorialOverlay } from "../tutorial/tutorial-overlay";
import { QuickReplies } from "../conversation/quick-replies";
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
import { useAppShellActions } from "../../hooks/use-app-shell-actions";
import { useSettings } from "../../hooks/use-settings";
import { useSearch } from "../../hooks/use-search";
import { useTodos } from "../../hooks/use-todos";
import { useSnippets } from "../../hooks/use-snippets";
import { usePlugins } from "../../hooks/use-plugins";
import { useDebugger } from "../../hooks/use-debugger";
import { useCollab } from "../../hooks/use-collab";
import { useGit } from "../../hooks/use-git";
import { useTutorial } from "../../hooks/use-tutorial";
import { isConfirmQuestion } from "../../lib/is-confirm-question";
import { extractQuickReplies } from "../../lib/extract-quick-replies";

export function AppShell() {
  const s = useAppShellState();
  const conv = useConversation(s.sessionId, s.initialMessages);
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
  const { clearPreviews, latestPreview } = useAiFileStream({});
  const { diagnostics, servers } = useLsp(fc.active?.path ?? null, fc.active?.buffer ?? undefined);
  const lspExtensions = useLspExtensions(servers, fc.active?.path ?? null, diagnostics);
  const errorInterpret = useErrorInterpret({ sessionId: s.sessionId, addUserMessage: conv.addUserMessage, markPending: conv.markPending });
  const changeReview = useChangeReview(s.sessionId);
  const pinnedCtx = usePinnedContext();
  const lint = useLint();

  useEffect(() => { if (!conv.streaming) clearPreviews(); }, [conv.streaming, clearPreviews]);
  useEffect(() => { if (terminal.exited && terminal.exitCode !== null && terminal.exitCode !== 0) errorInterpret.offerInterpretation(terminal.output, terminal.exitCode); }, [terminal.exited, terminal.exitCode]);
  useEffect(() => { if (s.project) gitHook.refreshStatus(); }, [s.project]);
  useEffect(() => { invoke<boolean>("check_claude_status").then(s.setClaudeAvailable).catch(() => s.setClaudeAvailable(false)); }, []);
  const panelCmd = usePanelCommands({
    toggleSearch: ui.toggleSearch, toggleGit: ui.toggleGit, toggleTodos: ui.toggleTodos,
    toggleSnippets: ui.toggleSnippets, togglePlugins: ui.togglePlugins, toggleDebug: ui.toggleDebug,
    addUserMessage: conv.addUserMessage, collabCreate: collabHook.createRoom, collabJoin: collabHook.joinRoom,
  });
  const handleCommand = useCommands({
    setProject: s.setProject, setSessionId: s.setSessionId, setInitialMessages: s.setInitialMessages,
    addUserMessage: conv.addUserMessage, refresh, refreshProjects: s.refreshProjects,
    toggleFileTree: ui.toggleFileTree, openFileTree: ui.openFileTree, toggleTerminal: ui.toggleTerminal,
    currentFilePath: fc.active?.path ?? null, sessionId: s.sessionId, projectId: s.project?.id ?? null,
    markPending: conv.markPending, onPanelCommand: panelCmd, toggleTutorial: tutorial.toggle,
  });
  const handleInput = useInputHandler({
    sessionId: s.sessionId, terminalId: s.terminalId, terminalOpen: ui.panels.terminalOpen,
    addUserMessage: conv.addUserMessage, markPending: conv.markPending, handleCommand,
    toggleTerminal: ui.toggleTerminal, setTerminalId: s.setTerminalId,
  });
  const actions = useAppShellActions(fc, ui, handleInput);
  useAppShellKeys({
    streaming: conv.streaming, toggleFileTree: ui.toggleFileTree, toggleTerminal: ui.toggleTerminal,
    toggleMainView: ui.toggleMainView, refresh, closeActiveFile: actions.closeActiveFile,
    toggleSearch: ui.toggleSearch, toggleQuickSwitch: ui.toggleQuickSwitch,
  });

  const lastAst = conv.messages.filter(m => m.role === "assistant" && !m.is_tool_activity).pop();
  const confirmMode = !conv.streaming && !!lastAst && isConfirmQuestion(lastAst.content);
  const [sidebarWidth, setSidebarWidth] = useState(192);
  const handleSidebarResize = useCallback((delta: number) => { setSidebarWidth((w) => Math.min(Math.max(w + delta, 120), Math.floor(window.innerWidth * 0.3))); }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 font-mono text-[15px]">
      <StatusBar projects={s.projects} currentProjectId={s.project?.id ?? null} claudeAvailable={s.claudeAvailable}
        fileTreeOpen={ui.panels.fileTreeOpen} gitBranch={gitHook.status?.branch ?? null}
        model={settingsHook.settings?.model ?? "sonnet"} collabStatus={collabHook.status}
        onToggleFileTree={() => { ui.toggleFileTree(); refresh(); }}
        onSwitchProject={(id) => handleCommand("switch", id)} onModelChange={(m) => settingsHook.update({ model: m })}
        onToggleSettings={ui.toggleSettings} onToggleTutorial={tutorial.toggle}
        onCollabShare={() => panelCmd("share", "")} onCollabLeave={collabHook.leave} />
      <div className="flex flex-1 min-h-0">
        {ui.panels.fileTreeOpen && (
          <>
            <aside style={{ width: sidebarWidth, maxWidth: "30vw" }} className="shrink-0 overflow-y-auto flex flex-col">
              <FileTreePanel nodes={nodes} onSelect={actions.handleFileSelect} onExpand={expandDir}
                onCreateFile={(path: string) => fc.createFile(path)} onPinFile={pinnedCtx.pinFile} />
            </aside>
            <ResizeHandle onResize={handleSidebarResize} />
          </>
        )}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <PanelControlBar mainView={ui.mainView} terminalOpen={ui.panels.terminalOpen} hasEditorFiles={fc.files.size > 0} onSetView={ui.setMainView} onToggleTerminal={ui.toggleTerminal} />
          <div className="flex-1 flex flex-col min-h-0">
            <AppShellContent mainView={ui.mainView} project={s.project} messages={conv.messages} streaming={conv.streaming}
              pending={conv.pending} livePreview={conv.streaming ? latestPreview : null} fc={fc} lspExtensions={lspExtensions}
              changeReview={changeReview} lint={lint} setMainView={ui.setMainView}
              openFileInEditor={actions.openFileInEditor} handleInput={handleInput} handleCommand={handleCommand}
              onTutorial={tutorial.toggle} />
          </div>
          <AppPanels panels={ui.panels} terminal={{ output: terminal.output, exited: terminal.exited, exitCode: terminal.exitCode, pendingError: errorInterpret.pendingError, onAcceptInterpret: errorInterpret.acceptInterpretation, onDismissInterpret: errorInterpret.dismissError, onPinOutput: (c) => pinnedCtx.pinText("terminal", c) }}
            settings={settingsHook} search={searchHook} todos={todosHook} snippets={snippetsHook}
            plugins={pluginsHook} debugSession={debugHook.session} debugActions={debugHook}
            onOpenFileAt={actions.openFileAt} onInsertSnippet={() => {}} onFixTodoWithAi={actions.handleFixTodo}
            onSelectDebugFrame={actions.handleSelectDebugFrame} onClosePanel={ui.closePanel} onToggleSettings={ui.toggleSettings} />
          {!(ui.mainView === "editor" && fc.active) && (
            <>
              <PinnedChips pins={pinnedCtx.pins} onUnpin={pinnedCtx.unpin} />
              {!confirmMode && lastAst && <QuickReplies replies={extractQuickReplies(lastAst.content)} onSelect={handleInput} />}
              <InputBar onSubmit={handleInput} disabled={conv.streaming} confirmMode={confirmMode} />
            </>
          )}
        </main>
      </div>
      {tutorial.open && <TutorialOverlay tutorial={tutorial} />}
      {ui.panels.quickSwitchOpen && (
        <QuickSwitch projects={s.projects} onSwitch={(id) => handleCommand("switch", id)} onClose={ui.toggleQuickSwitch} />
      )}
    </div>
  );
}
