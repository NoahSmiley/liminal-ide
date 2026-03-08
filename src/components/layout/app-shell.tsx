import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { StatusBar } from "./status-bar";
import { ActivityBar } from "./activity-bar";
import { StatusFooter } from "./status-footer";
import { InputBar } from "./input-bar";
import { PinnedChips } from "../conversation/pinned-chips";
import { ImageAttachmentBar } from "./image-attachment";
import { ResizeHandle } from "../shared/resize-handle";
import { AppShellContent } from "./app-shell-content";
import { Sidebar } from "./sidebar";
import { QuickSwitch } from "./quick-switch";
import { TutorialOverlay } from "../tutorial/tutorial-overlay";
import { QuickReplies } from "../conversation/quick-replies";
import { useConversation } from "../../hooks/use-conversation";
import { useFileTree } from "../../hooks/use-file-tree";
import { useOpenFiles } from "../../hooks/use-open-files";
import { useAiFileStream } from "../../hooks/use-ai-file-stream";
import { useMultiTerminal } from "../../hooks/use-multi-terminal";
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
import { usePlugins } from "../../hooks/use-plugins";
import { useDebugger } from "../../hooks/use-debugger";
import { useCollab } from "../../hooks/use-collab";
import { useRelay } from "../../hooks/use-relay";
import { useGit } from "../../hooks/use-git";
import { useTutorial } from "../../hooks/use-tutorial";
import { usePasteHandler } from "../../hooks/use-paste-handler";
import { useDevServerDetect } from "../../hooks/use-dev-server-detect";
import { usePreviewHealth } from "../../hooks/use-preview-health";
import { isConfirmQuestion } from "../../lib/is-confirm-question";
import { extractQuickReplies } from "../../lib/extract-quick-replies";
import { useSkills } from "../../hooks/use-skills";
import { useAgents } from "../../hooks/use-agents";
import { SkillPalette } from "./skill-palette";
import { useGuidedWalkthrough } from "../../hooks/use-guided-walkthrough";

export function AppShell() {
  const s = useAppShellState();
  const conv = useConversation(s.sessionId, s.initialMessages, useCallback(
    (id: string) => { s.setSessionId(id); },
    [s.setSessionId],
  ));
  const { nodes, refresh, expandDir } = useFileTree();
  const fc = useOpenFiles();
  const mt = useMultiTerminal();
  const ui = useUiStore();
  const paste = usePasteHandler();
  const settingsHook = useSettings();
  const searchHook = useSearch();
  const pluginsHook = usePlugins();
  const debugHook = useDebugger();
  const collabHook = useCollab();
  const relayHook = useRelay();
  const gitHook = useGit();
  const tutorial = useTutorial();
  const skillsHook = useSkills();
  const agentsHook = useAgents();
  const { clearPreviews, latestPreview } = useAiFileStream({});
  const { diagnostics, servers } = useLsp(fc.active?.path ?? null, fc.active?.buffer ?? undefined);
  const lspExtensions = useLspExtensions(servers, fc.active?.path ?? null, diagnostics);
  const errorInterpret = useErrorInterpret({ sessionId: s.sessionId, addUserMessage: conv.addUserMessage, markPending: conv.markPending });
  const changeReview = useChangeReview(s.sessionId);
  const guided = useGuidedWalkthrough({
    turns: changeReview.turns,
    streaming: conv.streaming,
    guidedEnabled: ui.guidedEnabled,
    messages: conv.messages,
    onSwitchView: useCallback((view: "guided" | "chat") => ui.setMainView(view), [ui.setMainView]),
    acceptFile: changeReview.acceptFile,
    rejectFile: changeReview.rejectFile,
    acceptAllFiles: changeReview.acceptAllFiles,
  });
  const pinnedCtx = usePinnedContext();
  const lint = useLint();

  // Dev server auto-detection — scan both terminal output and AI bash tool results
  const terminalOutputs = useMemo(() => {
    return mt.terminalIds.map((id) => mt.terminals.get(id)?.output ?? "");
  }, [mt.terminalIds, mt.terminals]);

  const conversationTexts = useMemo(() => {
    return conv.messages
      .filter((m) => m.role === "tool" && m.tool_name === "Bash")
      .slice(-5)
      .map((m) => m.content.slice(-500));
  }, [conv.messages]);

  useDevServerDetect({
    terminalOutputs,
    conversationTexts,
    currentPreviewUrl: ui.previewUrl,
    onDetect: useCallback((url: string) => {
      ui.setPreviewUrl(url);
    }, [ui.setPreviewUrl]),
  });

  usePreviewHealth({
    url: ui.previewUrl,
    onStatusChange: useCallback((live: boolean) => {
      ui.setPreviewLive(live);
    }, [ui.setPreviewLive]),
  });

  useEffect(() => { if (!conv.streaming) clearPreviews(); }, [conv.streaming, clearPreviews]);
  useEffect(() => { if (mt.active?.exited && mt.active.exitCode !== null && mt.active.exitCode !== 0) errorInterpret.offerInterpretation(mt.active.output, mt.active.exitCode); }, [mt.active?.exited, mt.active?.exitCode]);
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
  const handleInputRaw = useInputHandler({
    sessionId: s.sessionId, terminalOpen: ui.mainView === "terminal",
    addUserMessage: conv.addUserMessage, markPending: conv.markPending, handleCommand,
    toggleTerminal: ui.toggleTerminal, spawnTerminal: mt.spawn, sendTerminalInput: mt.sendInput,
    activeTerminalId: mt.activeTerminal,
  });
  const handleInput = useCallback(async (input: string) => {
    if (paste.attachments.length > 0) {
      const parts: string[] = [];
      for (const a of paste.attachments) {
        try {
          const text = await invoke<string>("upload_image", { base64Data: a.base64, mimeType: a.mimeType });
          parts.push(text);
        } catch { /* skip failed uploads */ }
      }
      paste.clearAttachments();
      const prefix = parts.length > 0 ? parts.join("\n") + "\n" : "";
      return handleInputRaw(prefix + input);
    }
    return handleInputRaw(input);
  }, [handleInputRaw, paste]);
  // Message queue: allow typing while agent runs, drain queue after each turn
  const messageQueue = useRef<string[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const queuedHandleInput = useCallback(async (input: string) => {
    if (conv.streaming || conv.pending) {
      messageQueue.current.push(input);
      setQueuedCount(messageQueue.current.length);
      return;
    }
    return handleInput(input);
  }, [conv.streaming, conv.pending, handleInput]);

  // Drain queue when streaming ends
  useEffect(() => {
    if (!conv.streaming && !conv.pending && messageQueue.current.length > 0) {
      const next = messageQueue.current.shift()!;
      setQueuedCount(messageQueue.current.length);
      handleInput(next);
    }
  }, [conv.streaming, conv.pending, handleInput]);

  const actions = useAppShellActions(fc, ui, queuedHandleInput);
  useAppShellKeys({
    streaming: conv.streaming, toggleFileTree: ui.toggleFileTree, toggleTerminal: ui.toggleTerminal,
    toggleMainView: ui.toggleMainView, refresh, closeActiveFile: actions.closeActiveFile,
    toggleSearch: ui.toggleSearch, toggleQuickSwitch: ui.toggleQuickSwitch,
    toggleGit: ui.toggleGit, toggleDebug: ui.toggleDebug, toggleTodos: ui.toggleTodos,
    toggleSkillPalette: ui.toggleSkillPalette, toggleGuided: ui.toggleGuided,
  });

  const lastAst = conv.messages.filter(m => m.role === "assistant" && !m.is_tool_activity).pop();
  const confirmMode = !conv.streaming && !!lastAst && isConfirmQuestion(lastAst.content);
  const [sidebarWidth, setSidebarWidth] = useState(192);
  const handleSidebarResize = useCallback((delta: number) => { setSidebarWidth((w) => Math.min(Math.max(w + delta, 120), Math.floor(window.innerWidth * 0.3))); }, []);

  const diagnosticCount = diagnostics?.length ?? 0;
  const closeSidebar = useCallback(() => ui.toggleSidebarTab(ui.sidebarTab!), [ui.sidebarTab, ui.toggleSidebarTab]);

  // Estimate context usage as percentage (rough: ~4 chars per token, 128k context)
  const contextPercent = useMemo(() => {
    const totalChars = conv.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
    const estimatedTokens = totalChars / 4;
    return Math.round((estimatedTokens / 128000) * 100);
  }, [conv.messages]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground text-[12px] leading-relaxed">
      {s.project && (
        <StatusBar projects={s.projects} currentProjectId={s.project?.id ?? null} claudeAvailable={s.claudeAvailable}
          gitBranch={gitHook.status?.branch ?? null}
          mainView={ui.mainView}
          hasEditorFiles={fc.files.size > 0}
          onGoHome={() => { s.setProject(null); s.setSessionId(null); s.setInitialMessages([]); s.refreshProjects(); ui.setMainView("chat"); }}
          onSwitchProject={(id) => handleCommand("switch", id)}
          onSetView={ui.setMainView} />
      )}
      <div className="flex flex-1 min-h-0">
        {s.project && (
          <ActivityBar
            sidebarTab={ui.sidebarTab}
            mainView={ui.mainView}
            hasEditorFiles={fc.files.size > 0}
            previewUrl={ui.previewUrl}
            previewLive={ui.previewLive}
            guidedEnabled={ui.guidedEnabled}
            onToggleSidebarTab={ui.toggleSidebarTab}
            onToggleSettings={ui.toggleSettings}
            onToggleTerminal={ui.toggleTerminal}
            onTogglePreview={ui.togglePreview}
            onTogglePair={ui.togglePair}
            onToggleGuided={ui.toggleGuided}
            onSetView={ui.setMainView}
          />
        )}
        {s.project && ui.sidebarTab && (
          <>
            <aside style={{ width: sidebarWidth, maxWidth: "30vw" }} className="shrink-0 flex flex-col overflow-hidden">
              <Sidebar
                tab={ui.sidebarTab}
                onClose={closeSidebar}
                fileTree={{ nodes, onSelect: actions.handleFileSelect, onExpand: expandDir, onCreateFile: (path: string) => fc.createFile(path), onPinFile: pinnedCtx.pinFile }}
                search={searchHook}
                onOpenFileAt={actions.openFileAt}
                gitOnSelectFile={(path) => actions.openFileAt(path, 1)}
                plugins={pluginsHook}
              />
            </aside>
            <ResizeHandle onResize={handleSidebarResize} />
          </>
        )}
        <main className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 flex flex-col min-h-0">
            <AppShellContent mainView={ui.mainView} project={s.project} messages={conv.messages} streaming={conv.streaming}
              pending={conv.pending} livePreview={conv.streaming ? latestPreview : null} fc={fc} lspExtensions={lspExtensions}
              changeReview={changeReview} lint={lint} setMainView={ui.setMainView}
              openFileInEditor={actions.openFileInEditor} handleInput={handleInput} handleCommand={handleCommand}
              onTutorial={tutorial.toggle}
              breakpoints={debugHook.session?.breakpoints ?? []}
              onToggleBreakpoint={(path: string, line: number) => {
                const exists = debugHook.session?.breakpoints.some((bp) => bp.path === path && bp.line === line);
                if (exists) debugHook.removeBreakpoint(path, line);
                else debugHook.setBreakpoint(path, line);
              }}
              collabCursors={collabHook.cursors ?? []}
              collabSendCursorUpdate={collabHook.sendCursorUpdate}
              terminal={{ output: mt.active?.output ?? "", exited: mt.active?.exited ?? false, exitCode: mt.active?.exitCode ?? null, pendingError: errorInterpret.pendingError, onAcceptInterpret: errorInterpret.acceptInterpretation, onDismissInterpret: errorInterpret.dismissError, onPinOutput: (c) => pinnedCtx.pinText("terminal", c) }}
              multiTerminal={{ terminalIds: mt.terminalIds, activeTerminal: mt.activeTerminal, onSpawn: mt.spawn, onKill: mt.kill, onSelect: mt.setActiveTerminal, onSendInput: mt.sendInput }}
              settings={settingsHook}
              previewUrl={ui.previewUrl}
              previewLive={ui.previewLive}
              onPreviewUrlChange={ui.setPreviewUrl}
              onGeneratePairingQR={relayHook.generatePairingQR}
              agents={agentsHook}
              skills={skillsHook}
              guided={guided} />
          </div>
          {s.project && ui.mainView === "chat" && (
            <>
              <PinnedChips pins={pinnedCtx.pins} onUnpin={pinnedCtx.unpin} />
              <ImageAttachmentBar attachments={paste.attachments} onRemove={paste.removeAttachment} />
              {!confirmMode && lastAst && <QuickReplies replies={extractQuickReplies(lastAst.content)} onSelect={queuedHandleInput} />}
              <InputBar onSubmit={queuedHandleInput} disabled={conv.streaming} confirmMode={confirmMode} queuedCount={queuedCount}
                onStop={() => { invoke("cancel_message").catch(() => {}); messageQueue.current = []; setQueuedCount(0); }}
                agents={agentsHook} />
            </>
          )}
        </main>
      </div>
      {s.project && (
        <StatusFooter
          activeFile={fc.active?.path ?? null}
          gitBranch={gitHook.status?.branch ?? null}
          diagnosticCount={diagnosticCount}
          claudeAvailable={s.claudeAvailable}
          model={settingsHook.settings?.model ?? "sonnet"}
          onModelChange={(m) => settingsHook.update({ model: m })}
          contextPercent={contextPercent}
          projects={s.projects}
          currentProjectId={s.project?.id ?? null}
          onSwitchProject={(id) => handleCommand("switch", id)}
        />
      )}
      {tutorial.open && <TutorialOverlay tutorial={tutorial} />}
      {ui.panels.quickSwitchOpen && (
        <QuickSwitch projects={s.projects} onSwitch={(id) => handleCommand("switch", id)} onClose={ui.toggleQuickSwitch} />
      )}
      {ui.panels.skillPaletteOpen && (
        <SkillPalette
          skills={skillsHook.skills}
          onSelect={(skill) => queuedHandleInput(skill.content)}
          onClose={ui.toggleSkillPalette}
        />
      )}
    </div>
  );
}
