# Liminal Architecture

Technical reference for developers working on Liminal.

## Design Principles

1. **Rust is the brain, React is the face.** All business logic, state, and I/O live in Rust. The frontend is a thin rendering layer.
2. **Event-driven.** Rust communicates to the frontend via a typed event bus. The frontend sends commands via Tauri IPC.
3. **No duplicate state.** Domain state lives in Rust only. React manages ephemeral UI state (which panel is open, scroll position).
4. **Type-first.** Define types before writing logic. No `any` in TypeScript. `Result<T, AppError>` on all Rust commands.

## Data Flow

```
User Input -> React -> invoke("command", args) -> Rust Command Handler
                                                       |
                                                  Core Module
                                                       |
                                              EventBus.emit(AppEvent)
                                                       |
Frontend <- Tauri Event <- "namespace:event" <---------+
```

Commands are request-response (async). Events are push notifications (streaming).

## Module Map

### Core Modules (src-tauri/src/core/)

Each module is a self-contained domain with its own types, logic, and state.

| Module | Responsibility | State |
|---|---|---|
| `ai_engine/` | Claude CLI subprocess, streaming, tool execution | Active process handle |
| `session/` | Conversation history persistence | Sessions in data_dir |
| `project/` | Workspace management, project metadata | Active project |
| `filesystem/` | File CRUD, directory listing, path validation | None (stateless) |
| `terminal/` | PTY management, shell processes | Map of terminal handles |
| `lsp/` | Language Server Protocol client | Server processes |
| `settings/` | User preferences, JSON persistence | Mutex<Settings> |
| `search/` | Project-wide regex search with gitignore | None (stateless) |
| `git/` | Status, log, diff via libgit2 | None (opens repo per call) |
| `diff_staging/` | Before/after snapshot diffing | Staged turn state |
| `editor_context/` | Tracks cursor position and selection | Mutex<EditorContext> |
| `mention_resolver/` | Parses @file patterns, resolves content | None (stateless) |
| `image_handler/` | Base64 decode, temp file storage | None (stateless) |
| `todo_tracker/` | Scans TODO/FIXME/HACK/XXX markers | None (stateless) |
| `snippets/` | CRUD snippet library, JSON persistence | Mutex<Vec<Snippet>> |
| `plugins/` | Plugin manifest loading, shell executor | Scanned plugin list |
| `debugger/` | DAP protocol adapter over stdio | Mutex<DebugSession> |
| `collab/` | WebSocket client for collaborative editing | Mutex<Option<Client>> |
| `events/` | Typed event bus, Tauri emit bridge | AppHandle |
| `change_tracker/` | Records file changes per AI turn | Change history |
| `context_pin/` | Pinned files/text for AI context | Pin list |
| `watcher/` | File system watcher (notify crate) | Watcher handle |
| `lint_runner/` | External linter execution | None |

### Command Layer (src-tauri/src/commands/)

Thin wrappers that extract state, call core modules, and return `Result<T, AppError>`. One file per domain:

```
ai.rs, filesystem.rs, terminal.rs, session.rs, project.rs,
settings.rs, search.rs, git.rs, diff_staging.rs, editor_context.rs,
mention.rs, image.rs, todo.rs, snippets.rs, plugins.rs,
debugger.rs, collab.rs, changes.rs, context.rs, summary.rs, lsp.rs
```

### Frontend Structure (src/)

```
hooks/           React hooks wrapping Tauri IPC
  use-settings.ts      Settings CRUD
  use-search.ts        Project search
  use-git.ts           Git status/log/diff
  use-todos.ts         TODO scanning
  use-snippets.ts      Snippet library
  use-plugins.ts       Plugin listing/execution
  use-debugger.ts      Debug session management
  use-collab.ts        Collaborative session
  use-open-files.ts    Multi-file tab state
  use-multi-terminal.ts Terminal multiplexing
  use-conversation.ts  Chat message stream
  use-terminal.ts      Single terminal I/O
  use-file-tree.ts     Directory tree
  use-commands.ts      Slash command router
  use-input-handler.ts Input parsing (/, !, !!)
  use-lsp.ts           LSP connection
  ...

components/
  layout/
    app-shell.tsx       Root component, layout orchestration
    status-bar.tsx      Top bar (project, claude status, settings)
    input-bar.tsx       Chat input with history
    settings-panel.tsx  Settings UI
    search-panel.tsx    Search results panel
    git-panel.tsx       Git status/log/diff tabs
    todo-panel.tsx      TODO list by file
    snippet-panel.tsx   Snippet library
    plugin-panel.tsx    Plugin browser
    collab-indicator.tsx Live session indicator
    collab-cursors.tsx  Remote cursor overlay
    ...
  file-viewer/
    editor-pane.tsx     Tab bar + code editor wrapper
    tab-bar.tsx         Open file tabs
    editor-toolbar.tsx  Undo/redo, cursor position
    file-tree-panel.tsx File tree sidebar
    file-tree.tsx       Recursive tree nodes
    tree-context-menu.tsx Right-click menu
    rename-input.tsx    Inline rename
    code-editor.tsx     CodeMirror integration
  conversation/
    conversation-stream.tsx Message list
    diff-review-panel.tsx  Per-file accept/reject
    diff-hunk.tsx       Colored diff lines
    pinned-chips.tsx    Context pin indicators
    ...
  terminal-output/
    terminal-panel.tsx  Single terminal display
    terminal-container.tsx Multi-terminal wrapper
    terminal-tabs.tsx   Terminal tab bar
  debugger/
    debug-toolbar.tsx   Play/pause/step controls
    variables-panel.tsx Variable inspector
    call-stack.tsx      Stack frame navigator
    breakpoint-gutter.tsx Line breakpoint markers

stores/
  ui-store.ts          Zustand store for panel toggles

types/
  settings-types.ts    Settings, Theme, KeybindingPreset
  search-types.ts      SearchMatch, SearchResult
  git-types.ts         GitStatus, GitCommit, GitFileDiff
  diff-types.ts        DiffHunk, DiffLine, FileDiff
  debug-types.ts       Breakpoint, StackFrame, Variable, DebugState
  collab-types.ts      CollabStatus, RemoteCursor
  todo-types.ts        TodoItem, TodoKind
  snippet-types.ts     Snippet
  plugin-types.ts      PluginManifest, PluginCommand
  image-types.ts       ImageAttachment
  ...
```

## Integration Status

Features that are fully implemented (backend + frontend components + tests) but not yet wired into `app-shell.tsx`:

| Feature | What's Needed to Wire Up |
|---|---|
| **Search panel** | Add `searchOpen` to ui-store, toggle in app-shell, connect `Cmd+Shift+F` |
| **Git panel** | Add `gitOpen` to ui-store, render GitPanel in app-shell |
| **TODO panel** | Add `todosOpen` to ui-store, add `/todos` command, render TodoPanel |
| **Snippet panel** | Add `snippetsOpen` to ui-store, add `/snippets` command, render SnippetPanel |
| **Plugin panel** | Add `pluginsOpen` to ui-store, add `/plugins` command, render PluginPanel |
| **Debug UI** | Add debug state to ui-store, render DebugToolbar + panels, integrate BreakpointGutter into CodeEditor |
| **Collab** | Add collab state, render CollabIndicator in status bar, add `/share` and `/join` commands |
| **@ Mentions** | Integrate MentionDropdown into InputBar, call resolve_mentions before send_message |
| **Image paste** | Integrate usePasteHandler into InputBar, render ImageAttachmentBar |
| **Terminal tabs** | Replace single TerminalPanel with TerminalContainer in app-shell |

Each feature follows the same pattern:
1. Add panel toggle to `stores/ui-store.ts`
2. Import and call the hook in `app-shell.tsx`
3. Conditionally render the component
4. Add keyboard shortcut in `use-app-shell-keys.ts` (optional)
5. Add slash command in `use-commands.ts` (optional)

## Error Handling

All errors flow through `error.rs`:

```rust
AppError
  ├── Ai(AiError)
  ├── FileSystem(FsError)
  ├── Git(GitError)
  ├── Terminal(TermError)
  ├── Session(SessionError)
  ├── Project(ProjectError)
  ├── Lsp(LspError)
  ├── Change(ChangeError)
  ├── Settings(SettingsError)
  ├── Search(SearchError)
  └── Debug(String)
```

All command handlers return `Result<T, AppError>`. `AppError` implements `Serialize` for Tauri IPC.

## Event Bus

Rust -> Frontend communication uses typed events:

```rust
AppEvent
  ├── Ai(AiEvent)          -> "ai:event"
  ├── Fs(FsEvent)          -> "fs:event"
  ├── Terminal(TerminalEvent) -> "terminal:event"
  ├── Session(SessionEvent) -> "session:event"
  ├── Project(ProjectEvent) -> "project:event"
  ├── System(SystemEvent)  -> "system:event"
  ├── Lsp(LspEvent)        -> "lsp:event"
  ├── Lint(LintEvent)      -> "lint:event"
  └── Settings(SettingsEvent) -> "settings:event"
```

Frontend listens via `useTauriEvent("ai:event", callback)`.

## Dependencies

### Rust
| Crate | Purpose |
|---|---|
| tauri 2 | Desktop framework |
| tokio | Async runtime |
| serde / serde_json | Serialization |
| thiserror | Error types |
| uuid | Unique IDs |
| portable-pty | Terminal PTY |
| regex | Search patterns |
| similar | Diff computation |
| git2 | Git operations |
| notify | File watching |
| tokio-tungstenite | WebSocket (collab) |
| futures-util | Async stream utilities |
| tempfile | Test temp directories |

### Frontend
| Package | Purpose |
|---|---|
| react 19 | UI framework |
| @tauri-apps/api | Tauri IPC bridge |
| @codemirror/* | Code editor |
| zustand | UI state store |
| tailwindcss | Styling |
| vitest | Test runner |

## Testing

```bash
# 98 Rust tests covering all core modules
cd src-tauri && cargo test

# 121 frontend tests covering types, hooks, invoke contracts
npx vitest run

# Type checking
npx tsc --noEmit
```

Test patterns:
- **Rust:** Inline `#[cfg(test)]` for small modules, separate `tests.rs` files for larger ones. `tempfile::tempdir()` for filesystem tests.
- **Frontend:** Mock `@tauri-apps/api/core` invoke, test command names and argument shapes, test pure logic extracted from hooks.

## File Size Limits

Enforced by CLAUDE.md:
- Rust files: max 200 lines
- React components: max 150 lines
- Type definition files: max 100 lines
- When approaching limits, split into submodules
