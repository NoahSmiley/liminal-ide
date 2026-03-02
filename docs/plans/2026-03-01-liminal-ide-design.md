# Liminal — AI-First Terminal IDE Design

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Rust-Heavy Backend with Minimal Frontend

---

## Vision

Rethink what an IDE is. Instead of a code editor with AI bolted on, Liminal is a conversational terminal where AI is the primary interface and code is the output artifact. The user describes what they want; the AI builds, runs, and manages it.

**Target:** Full-stack development with deployment — conversation to deployed product.
**MVP scope:** Conversational AI + file creation/editing + integrated terminal execution.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    TAURI SHELL                        │
│  ┌────────────────────────────────────────────────┐  │
│  │          Thin React Frontend (Renderer)        │  │
│  │  Conversation Stream | File Viewer | Terminal  │  │
│  │                                                │  │
│  │          Tauri IPC (Commands + Events)          │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────┴───────────────────────────┐  │
│  │           Rust Backend (Core Logic)            │  │
│  │                                                │  │
│  │  SessionManager | AiEngine  | ProjectManager   │  │
│  │  FileSystem     | Terminal  | EventBus         │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Principle:** Rust owns all state and logic. React is a rendering layer — it receives events from Rust and sends user input back. Business logic never lives in the frontend.

**AI Backend:** Claude CLI subprocess (`claude --output-format stream-json`).

---

## Rust Backend Modules

### SessionManager (`core/session.rs`)

Owns conversation state. Every AI interaction happens within a session.

- `Session` — id, project_id, messages, context_files, status
- `create_session(project_id)` → Session
- `append_message(id, Message)` → ()
- `add_context_file(id, path)` → ()
- `list_sessions(project_id)` → Vec<SessionSummary>
- `archive_session(id)` → ()

Persists to SQLite for query flexibility.

### AiEngine (`core/ai_engine.rs`)

Single gateway to Claude. Spawns CLI subprocess, streams structured JSON, translates into typed events.

- `send_message(session, message)` → Stream<AiEvent>
- `cancel_active_request(session_id)` → ()
- `check_availability()` → bool

AiEvent enum: `TextDelta`, `ToolUse`, `ToolResult`, `TurnComplete`, `Error`.

Handles tool calls by routing to the appropriate module (filesystem, terminal) and feeding results back to Claude.

### FileSystem (`core/filesystem.rs`)

All file I/O goes through here. No raw `std::fs` calls elsewhere.

- `read_file`, `write_file`, `create_file`, `delete_file`
- `list_directory`, `tree(path, depth)`
- `watch(path)` — emits `fs:file-changed` events
- `diff(path, old, new)`, `search(path, query)`

All paths validated and sandboxed to project directory.

### TerminalManager (`core/terminal.rs`)

Manages shell processes via PTY. Users and AI can both execute commands.

- `spawn_shell(project_dir)` → TerminalId
- `send_input(id, input)` → ()
- `resize(id, cols, rows)` → ()
- `kill(id)` → ()

Output streams as `terminal:output` events. Supports multiple concurrent terminals.

### ProjectManager (`core/project.rs`)

Project lifecycle and configuration.

- `create_project(name, path)` → Project
- `open_project(path)` → Project
- `get_config(id)` → ProjectConfig
- `list_recent()` → Vec<ProjectSummary>

### EventBus (`core/events.rs`)

All Rust → Frontend communication. Events are fire-and-forget, async, non-blocking.

AppEvent enum (namespaced):
- `Ai(AiEvent)` — `ai:text-delta`, `ai:tool-use`, etc.
- `Fs(FsEvent)` — `fs:file-changed`, `fs:tree-updated`
- `Terminal(TerminalEvent)` — `terminal:output`, `terminal:exit`
- `Session(SessionEvent)` — `session:created`, `session:message`
- `Project(ProjectEvent)` — `project:opened`, `project:closed`
- `System(SystemEvent)` — `system:error`, `system:ready`

### Commands Layer (`commands/`)

Thin wrappers bridging Tauri IPC to core modules. No logic — just validation, delegation, error mapping. Every command returns `Result<T, AppError>`.

---

## Frontend (Thin Renderer)

### Layout

```
┌──────────────────────────────────────────────────────┐
│ [status bar]  ~/liminal/my-project  ◆ claude ▊       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ CONVERSATION ─────────────────────────────────┐  │
│  │ > build me a rest api with auth                │  │
│  │                                                │  │
│  │ ◆ Creating project structure...                │  │
│  │   ├── src/main.rs         [created]            │  │
│  │   └── Cargo.toml          [created]            │  │
│  │                                                │  │
│  │ ┌─ src/main.rs ───────────────────────────┐    │  │
│  │ │ use axum::{Router, routing::get};       │    │  │
│  │ │ ...                         [collapse ▴]│    │  │
│  │ └─────────────────────────────────────────┘    │  │
│  │                                                │  │
│  │ ◆ Running `cargo build`...                     │  │
│  │   Finished in 2.3s ✓                           │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ FILES (side panel, toggled) ──────────────────┐  │
│  │ project tree view                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ TERMINAL (bottom panel, toggled) ─────────────┐  │
│  │ live PTY output                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
├──────────────────────────────────────────────────────┤
│ $ ▊                                                  │
└──────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Data source |
|---|---|---|
| `app-shell.tsx` | Layout container, panel management | UI store |
| `status-bar.tsx` | Path, connection, hints | `session:*` events |
| `input-bar.tsx` | Terminal prompt | Keystrokes → commands |
| `conversation-stream.tsx` | Message list | `ai:*` events |
| `message-bubble.tsx` | Single message | Props |
| `code-block.tsx` | Inline code, collapse/expand | Props |
| `file-activity.tsx` | File action indicators | `fs:*` events |
| `command-output.tsx` | Inline terminal output | `terminal:*` events |
| `file-tree.tsx` | Side panel directory listing | `fs:tree-updated` |
| `file-editor.tsx` | Read/edit file in side panel | `read_file` command |
| `terminal-panel.tsx` | Bottom panel live terminal | `terminal:output` |

### Hooks

- `useTauriEvent<T>(event)` — subscribe to Rust events, auto-cleanup
- `useTauriCommand<T>(cmd, args)` — call Rust command, returns Result
- `useConversation(sessionId)` — aggregates ai:* events into message list
- `useFileTree(projectId)` — keeps file tree in sync via fs:* events
- `useTerminal(terminalId)` — buffers terminal output for rendering

### Frontend does NOT

- Fetch or cache AI responses (Rust streams them)
- Read or write files (asks Rust via commands)
- Manage processes (Rust spawns and manages terminals)
- Store domain state (only ephemeral UI state: modals, focus, scroll)

---

## Data Flow

### Conversation Loop

1. User types message in input bar → `invoke("send_message")`
2. `commands/ai.rs` validates, appends to session
3. `core/ai_engine.rs` spawns Claude CLI with session history
4. Claude streams JSON → parsed into `AiEvent` variants
5. `TextDelta` → emitted to frontend, appended to conversation
6. `ToolUse` → routed to filesystem/terminal, result fed back to Claude
7. `TurnComplete` → frontend re-enables input

### File Operations

1. AI or user triggers file operation
2. `core/filesystem.rs` performs operation, updates index
3. `fs:file-changed` event emitted
4. Frontend updates conversation stream (inline card) and file tree

### Terminal Execution

1. AI tool call or user `!command` input
2. `core/terminal.rs` spawns PTY in project directory
3. Output streams as `terminal:output` events
4. On exit, exit code fed back to AI as tool result

### Input Routing

- Starts with `!` → terminal command (strip prefix, send to terminal.rs)
- Starts with `/` → app command (/files, /new, /refresh)
- Anything else → conversation message to ai_engine

---

## Error Handling

### Error Hierarchy

```
AppError
├── Ai: CliNotFound, NotAuthenticated, ProcessCrashed,
│       StreamCorrupted, RateLimited, Timeout
├── FileSystem: NotFound, PermissionDenied, OutsideProject, DiskFull
├── Terminal: SpawnFailed, ProcessHung, PtyUnavailable
├── Session: NotFound, CorruptedHistory, StorageFailed
└── Project: InvalidPath, AlreadyOpen, ConfigInvalid
```

### Recovery Strategies

- **AI crashes don't lose conversation.** Session history persisted to disk. Partial responses saved. User retries pick up from last state.
- **Tool failures are AI-visible.** Errors fed back to Claude as tool results so it can adapt.
- **Frontend always shows something.** Heartbeat indicator if event bus goes quiet. "Interrupted" state instead of frozen spinners.
- **Graceful degradation:** Claude unavailable → offline mode (files/terminal still work). PTY unavailable → non-interactive command exec. File watcher fails → manual `/refresh`.

### Error Display

Errors surface inline in the conversation stream, styled as terminal errors:

```
◆ error: Claude CLI not found
  run `npm install -g @anthropic-ai/claude-cli` to install
```

No modal dialogs. Terminal aesthetic throughout.

---

## Aesthetic Guidelines

Carried forward from existing Liminal project:

- **Background:** Pure black (#000000)
- **Font:** Geist Mono, monospace stack, 13px base
- **Borders:** Sharp (0px radius), subtle gray (#1e1e22)
- **Panels:** TUI-style with floating labels
- **Text:** Small sizes (10-13px), high contrast on black
- **Accents:** Cyan, purple, amber — sparingly
- **Interactions:** Keyboard-first, vim-inspired
- **Animations:** Minimal — blinking cursors, subtle fades only

---

## Tech Stack

### Rust Backend
- Tauri 2 (desktop shell + IPC)
- tokio (async runtime)
- serde / serde_json (serialization)
- thiserror (error types)
- portable-pty (terminal management)
- rusqlite or sled (session persistence)
- notify (file watching)

### Frontend
- React 19 + TypeScript
- Tailwind CSS 4
- Zustand (UI-only state)
- @tauri-apps/api (IPC)
- Geist Mono font

---

## MVP Feature Set

1. Conversational AI terminal (send messages, receive streaming responses)
2. File creation/editing via AI tool calls (inline display + file tree panel)
3. Integrated terminal execution (AI-triggered and user-triggered)
4. Project management (create, open, switch projects)
5. Session persistence (conversations survive app restart)
