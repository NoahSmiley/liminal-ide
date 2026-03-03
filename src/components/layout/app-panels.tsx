import { TuiPanel } from "../shared/tui-panel";
import { TerminalPanel } from "../terminal-output/terminal-panel";
import { SettingsPanel } from "./settings-panel";
import { SearchPanel } from "./search-panel";
import { GitPanel } from "./git-panel";
import { TodoPanel } from "./todo-panel";
import { SnippetPanel } from "./snippet-panel";
import { PluginPanel } from "./plugin-panel";
import { DebugToolbar } from "../debugger/debug-toolbar";
import { VariablesPanel } from "../debugger/variables-panel";
import { CallStack } from "../debugger/call-stack";
import type { Settings } from "../../types/settings-types";
import type { SearchResult } from "../../types/search-types";
import type { TodoItem } from "../../types/todo-types";
import type { Snippet } from "../../types/snippet-types";
import type { PluginManifest } from "../../types/plugin-types";
import type { DebugSession } from "../../types/debug-types";
import type { StackFrame } from "../../types/debug-types";

export interface AppPanelsProps {
  panels: { terminalOpen: boolean; settingsOpen: boolean; searchOpen: boolean; gitOpen: boolean; todosOpen: boolean; snippetsOpen: boolean; pluginsOpen: boolean; debugOpen: boolean };
  terminal: { output: string; exited: boolean; exitCode: number | null; pendingError: string | null; onAcceptInterpret: () => void; onDismissInterpret: () => void; onPinOutput: (c: string) => void };
  settings: { settings: Settings | null; update: (s: Partial<Settings>) => void; reset: () => void };
  search: { results: SearchResult[]; loading: boolean; query: string; caseSensitive: boolean; useRegex: boolean; search: (q: string) => void; clear: () => void; setCaseSensitive: (v: boolean) => void; setUseRegex: (v: boolean) => void };
  todos: { groupedByFile: Record<string, TodoItem[]>; loading: boolean; scan: () => void };
  snippets: { snippets: Snippet[]; add: (t: string, l: string, c: string) => void; remove: (id: string) => void };
  plugins: { plugins: PluginManifest[]; refresh: () => void; runCommand: (p: string, c: string) => Promise<string> };
  debugSession: DebugSession | null;
  debugActions: { continueExec: () => void; stepOver: () => void; stepInto: () => void; stepOut: () => void; stop: () => void };
  onOpenFileAt: (path: string, line: number) => void;
  onInsertSnippet: (content: string) => void;
  onFixTodoWithAi: (item: TodoItem) => void;
  onSelectDebugFrame: (frame: StackFrame) => void;
  onClosePanel: (panel: string) => void;
  onToggleSettings: () => void;
}

export function AppPanels(p: AppPanelsProps) {
  return (
    <>
      {p.panels.terminalOpen && (
        <TuiPanel title="terminal" className="mx-3 mb-2">
          <TerminalPanel output={p.terminal.output} exited={p.terminal.exited} exitCode={p.terminal.exitCode}
            pendingError={p.terminal.pendingError} onAcceptInterpret={p.terminal.onAcceptInterpret}
            onDismissInterpret={p.terminal.onDismissInterpret} onPinOutput={p.terminal.onPinOutput} />
        </TuiPanel>
      )}
      {p.panels.settingsOpen && p.settings.settings && (
        <SettingsPanel settings={p.settings.settings} onUpdate={p.settings.update} onReset={p.settings.reset} onClose={p.onToggleSettings} />
      )}
      {p.panels.searchOpen && (
        <SearchPanel results={p.search.results} loading={p.search.loading} query={p.search.query}
          caseSensitive={p.search.caseSensitive} useRegex={p.search.useRegex} onSearch={p.search.search}
          onClear={p.search.clear} onToggleCase={() => p.search.setCaseSensitive(!p.search.caseSensitive)}
          onToggleRegex={() => p.search.setUseRegex(!p.search.useRegex)}
          onOpenFileAt={p.onOpenFileAt} onClose={() => p.onClosePanel("searchOpen")} />
      )}
      {p.panels.gitOpen && (
        <GitPanel onSelectFile={(path) => p.onOpenFileAt(path, 1)} onClose={() => p.onClosePanel("gitOpen")} />
      )}
      {p.panels.todosOpen && (
        <TodoPanel groupedByFile={p.todos.groupedByFile} loading={p.todos.loading} onScan={p.todos.scan}
          onOpenFile={p.onOpenFileAt} onFixWithAi={p.onFixTodoWithAi} onClose={() => p.onClosePanel("todosOpen")} />
      )}
      {p.panels.snippetsOpen && (
        <SnippetPanel snippets={p.snippets.snippets} onAdd={p.snippets.add} onRemove={p.snippets.remove}
          onInsert={p.onInsertSnippet} onClose={() => p.onClosePanel("snippetsOpen")} />
      )}
      {p.panels.pluginsOpen && (
        <PluginPanel plugins={p.plugins.plugins} onRunCommand={p.plugins.runCommand}
          onRefresh={p.plugins.refresh} onClose={() => p.onClosePanel("pluginsOpen")} />
      )}
      {p.panels.debugOpen && p.debugSession && (
        <TuiPanel title="debug" className="mx-3 mb-2">
          <DebugToolbar state={p.debugSession.state} onContinue={p.debugActions.continueExec}
            onStepOver={p.debugActions.stepOver} onStepInto={p.debugActions.stepInto}
            onStepOut={p.debugActions.stepOut} onStop={p.debugActions.stop} />
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 px-2">variables</div>
              <VariablesPanel variables={p.debugSession.variables} />
            </div>
            <div className="flex-1">
              <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5 px-2">call stack</div>
              <CallStack frames={p.debugSession.stack_frames} onSelectFrame={p.onSelectDebugFrame} />
            </div>
          </div>
        </TuiPanel>
      )}
    </>
  );
}
