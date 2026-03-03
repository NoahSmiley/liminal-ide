# Liminal

An AI-first terminal IDE. The conversational interface is the primary workspace — you talk, the AI writes code.

Built with Tauri 2, Rust, React 19, and Claude.

## Quick Start

```bash
# Prerequisites: Rust, Node.js, Claude CLI
npm install
cargo install tauri-cli

# Authenticate Claude
claude login

# Run
cargo tauri dev
```

## What It Does

Liminal replaces the traditional IDE paradigm. Instead of manually editing files through menus and panels, you describe what you want in natural language. The AI reads your project, writes code, runs commands, and explains what it did — all in a streaming conversation.

```
you:  /open ~/projects/my-app
      "add a login page with email/password auth"

ai:   [reads project structure]
      [creates src/pages/login.tsx]
      [adds auth utilities]
      [updates routing]
      Done. Created login page with form validation...

you:  /commit "add login page"
```

## Features

### Core Loop
- **Conversational AI** — Claude reads your codebase, writes files, runs commands
- **Streaming responses** — see AI output as it generates
- **Change tracking** — every file modification is recorded with before/after snapshots
- **Change review** — accept or revert AI changes per-turn

### Editor
- **Multi-file tabs** — open multiple files, switch between them (`Cmd+W` to close)
- **CodeMirror 6** — syntax highlighting, undo/redo, line numbers
- **LSP integration** — completions, diagnostics, go-to-definition, hover
- **Editor toolbar** — undo/redo buttons, cursor position, language indicator
- **File tree** — expandable sidebar with right-click context menu (rename, delete, create)

### Terminal
- **Integrated terminal** — run shell commands (`!ls`, `!npm test`)
- **Natural language commands** — `!!deploy this to staging` translates to shell commands
- **Error interpretation** — AI offers to explain non-zero exit codes
- **Multiple terminals** — backend supports concurrent terminal sessions

### Git (via AI)
- `/commit [msg]` — stage and commit with AI-generated or custom message
- `/diff` — show current changes
- `/status` — show working tree status
- `/pr [desc]` — create a pull request
- `/log` — show recent commit history
- `/review` — AI reviews current file or recent changes

### Settings
- Model selection, theme, font size, keybinding preset (default/vim/emacs)
- Persists across restarts
- Access via `*` button in status bar

### Project Management
- `/new <name>` — create a new project
- `/open <path>` — open an existing directory
- `/summary` — AI summarizes the project structure
- `/files` — toggle file tree (`Cmd+B`)

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+B` | Toggle file tree |
| `Cmd+J` | Toggle terminal |
| `Cmd+E` | Toggle chat/editor view |
| `Cmd+W` | Close active file tab |
| `Cmd+Shift+F` | Search project |
| `Cmd+Z` | Undo (in editor) |
| `Cmd+Shift+Z` | Redo (in editor) |
| `Cmd+S` | Save current file |

## Slash Commands

| Command | Description |
|---|---|
| `/new <name>` | Create new project |
| `/open <path>` | Open existing project |
| `/files` | Toggle file tree |
| `/terminal` | Toggle terminal |
| `/refresh` | Refresh file tree |
| `/commit [msg]` | Commit changes |
| `/diff` | Show git diff |
| `/status` | Git status |
| `/pr [desc]` | Create pull request |
| `/log` | Git log |
| `/review` | AI code review |
| `/summary` | Summarize project |
| `/help` | Show all commands |

## Shell Commands

Prefix with `!` to run directly:
```
!npm install express
!git branch -a
!cargo test
```

Prefix with `!!` for natural language:
```
!!find all TODO comments in the project
!!what ports are currently in use
```

## Architecture

```
src-tauri/           Rust backend (owns all state)
  src/
    core/            Domain logic modules
      ai_engine/     Claude CLI orchestration
      filesystem/    File operations + watching
      terminal/      PTY shell processes
      session/       Conversation persistence
      project/       Workspace management
      settings/      Persistent user settings
      search/        Project-wide text search
      git/           Git status, log, diff (libgit2)
      diff_staging/  Before/after diff computation
      editor_context/ Cursor + selection tracking
      mention_resolver/ @file mention parsing
      image_handler/ Screenshot/image handling
      todo_tracker/  TODO/FIXME/HACK scanner
      snippets/      Code snippet library
      plugins/       Plugin manifest + executor
      debugger/      DAP protocol adapter
      collab/        WebSocket collaborative editing
      lsp/           Language Server Protocol
      events/        Event bus (Rust -> Frontend)
    commands/        Tauri IPC command handlers

src/                 React frontend (thin renderer)
  components/
    conversation/    Chat stream, message rendering
    file-viewer/     Code editor, file tree, tabs
    terminal-output/ Terminal emulator
    debugger/        Debug toolbar, variables, call stack
    layout/          App shell, panels, status bar
    shared/          Reusable primitives
  hooks/             Custom hooks (state, IPC, events)
  types/             TypeScript type definitions
  stores/            UI-only state (Zustand)
```

## Backend Capabilities

These features have full Rust backends and frontend components ready to be wired into the main UI:

| Feature | Backend | Frontend | Status |
|---|---|---|---|
| **Project-wide search** | Regex + gitignore-aware | Search panel with results | Ready |
| **Git UI panel** | Status, log, diff via libgit2 | Tabbed panel (status/log/diff) | Ready |
| **TODO tracker** | Scans TODO/FIXME/HACK/XXX | Grouped panel with "fix with AI" | Ready |
| **Snippet library** | CRUD with JSON persistence | Add/insert/remove cards | Ready |
| **Plugin system** | JSON manifest + shell executor | Plugin panel with command runner | Ready |
| **Debug (DAP)** | Full DAP protocol adapter | Toolbar, variables, call stack, breakpoints | Ready |
| **Collaboration** | WebSocket room-based sessions | Connection indicator, remote cursors | Ready |
| **@ Mentions** | Resolves @file to content | Autocomplete dropdown | Ready |
| **Image paste** | Base64 decode + storage | Thumbnail attachment bar | Ready |

## Testing

```bash
# Rust tests (98 tests)
cd src-tauri && cargo test

# Frontend tests (121 tests)
npx vitest run

# Type checking
npx tsc --noEmit
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2 |
| Backend | Rust (tokio, serde, thiserror) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS |
| Editor | CodeMirror 6 |
| AI | Claude CLI (subprocess) |
| Git | libgit2 (git2 crate) |
| Diff | similar crate (Myers algorithm) |
| State | Rust owns domain state, Zustand for UI ephemera |
| IPC | Tauri commands + event bus |

## Design

- Pure black background (#000)
- Geist Mono, monospace
- Sharp borders (0px radius)
- TUI-style floating panels
- Cyan/purple/amber accents
- 10-13px text sizes
- Keyboard-first navigation

## License

Private.
