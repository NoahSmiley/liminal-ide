# Liminal — AI-First Terminal IDE

## Project Overview
A Tauri desktop app: Rust-heavy backend with a thin React frontend. The conversational AI terminal is the primary interface — code is the output, not the workspace.

**Stack:** Tauri 2 + Rust (Axum) backend + React 19 + TypeScript + Tailwind CSS
**AI Backend:** Claude CLI subprocess
**Architecture:** Rust owns all state and logic. React is a rendering layer only.

---

## Anti-Vibe-Coding Rules

These rules exist to prevent the project from degrading into unmaintainable spaghetti. Follow them without exception.

### 1. No Code Without a Home
Every file belongs to a module. Every module has a single responsibility. If you can't name which module a piece of code belongs to, stop and define the module first.

**Rust modules:** `session`, `ai_engine`, `project`, `filesystem`, `terminal`, `events`
**Frontend directories:** `components/`, `hooks/`, `types/`, `lib/`

Do NOT create files at the root of `src/` or dump utilities into a `misc` or `helpers` file.

### 2. Define Types Before Writing Logic
Always define the data structures and interfaces FIRST. In Rust, define structs and enums before implementing functions. In TypeScript, define types/interfaces before building components.

No `any` types in TypeScript. No `.unwrap()` in Rust without a comment explaining why it's safe.

### 3. One Function, One Job
Functions should do ONE thing. If a function name contains "and" (e.g., `parse_and_save`), split it. Max function length: ~40 lines. If it's longer, decompose it.

### 4. Errors Are Not Optional
- **Rust:** Use `Result<T, E>` with custom error types. No `.unwrap()` in production paths. Use `thiserror` for error enums. Propagate with `?`.
- **TypeScript:** Handle all Promise rejections. No silent `catch(() => {})`.
- **User-facing errors:** Always surface meaningful messages. Never swallow errors silently.

### 5. No Orphan Code
- Do not leave dead code, commented-out blocks, or half-built features in the codebase.
- If a feature is removed, remove ALL traces — types, handlers, UI components, routes.
- No `TODO` comments without a linked issue or immediate plan to resolve.

### 6. State Flows One Direction
- Rust backend is the source of truth for ALL application state.
- Frontend receives state via Tauri events, sends input via Tauri commands.
- Frontend NEVER manages domain state — only ephemeral UI state (modals open, input focus, scroll position).
- No duplicate state between Rust and React. If React needs data, it comes from Rust.

### 7. No Dependency Roulette
- Do not add a dependency for something achievable in <30 lines of code.
- Before adding any crate or npm package, justify it: what does it do that we can't reasonably do ourselves?
- Pin dependency versions. No wildcards.

### 8. Consistent Patterns, Always
- **Rust naming:** `snake_case` for functions/variables, `PascalCase` for types, `SCREAMING_SNAKE` for constants.
- **TypeScript naming:** `camelCase` for functions/variables, `PascalCase` for components/types.
- **File naming:** `snake_case.rs` for Rust, `kebab-case.tsx` for React components.
- **Tauri commands:** `snake_case` verb-noun pattern (e.g., `send_message`, `read_file`, `list_directory`).
- **Events (Rust → Frontend):** `namespace:event-name` pattern (e.g., `ai:stream-delta`, `fs:file-changed`).

### 9. Small Commits, Clear Boundaries
- Each commit should represent ONE logical change.
- Never commit broken code to main. If it doesn't compile/build, it doesn't get committed.
- Commit messages: imperative mood, explain WHY not WHAT. (e.g., "Add session persistence so conversations survive app restart")

### 10. No Magic Numbers or Strings
- All configuration values go in typed config structs.
- No hardcoded paths, ports, timeouts, or model names scattered through the code.
- Use constants or enums for anything referenced in more than one place.

### 11. No Giant Files
Files that grow too large become unreadable, unnavigable, and merge-conflict magnets. Enforce these hard limits:

- **Rust files:** Max **200 lines.** If a module grows beyond this, split it into submodules with a `mod.rs` re-exporting the public API.
- **React components:** Max **150 lines** per `.tsx` file. Extract sub-components, hooks, or utilities into their own files.
- **Type definition files:** Max **100 lines.** Split by domain (e.g., `ai-types.ts`, `fs-types.ts`, not one giant `types.ts`).
- **CSS/style files:** Max **200 lines.** Use Tailwind utilities inline; only extract to CSS for things Tailwind can't express.

**When a file approaches the limit:**
1. Stop and refactor BEFORE adding more code.
2. Identify cohesive chunks that can become their own file/module.
3. Use re-exports (`mod.rs` / `index.ts`) so the public API stays clean.

**Splitting patterns:**
- Rust: `core/ai_engine.rs` → `core/ai_engine/mod.rs` + `core/ai_engine/streaming.rs` + `core/ai_engine/tools.rs`
- React: `conversation-panel.tsx` → `conversation-panel.tsx` + `message-list.tsx` + `message-bubble.tsx`
- Types growing? Split by domain boundary, not alphabetically.

---

## Architecture Invariants

These are structural rules that must never be violated:

1. **Rust is the brain, React is the face.** Business logic never lives in the frontend.
2. **All AI interactions go through the `ai_engine` module.** No direct Claude CLI calls from anywhere else.
3. **File system operations go through the `filesystem` module.** No raw `std::fs` calls scattered through the codebase.
4. **Terminal operations go through the `terminal` module.** No spawning processes outside this module.
5. **The event bus is the only way Rust communicates with the frontend.** No polling, no request-response for state updates.
6. **Every Tauri command returns a `Result<T, AppError>`.** No panics, no unwraps in command handlers.

---

## File Structure

```
src-tauri/
  src/
    main.rs              # Tauri setup, command registration
    lib.rs               # Module declarations
    error.rs             # AppError enum (thiserror)
    config.rs            # App configuration
    commands/             # Tauri command handlers (thin wrappers)
      mod.rs
      ai.rs
      filesystem.rs
      terminal.rs
      session.rs
      project.rs
    core/                 # Domain logic (no Tauri dependency)
      mod.rs
      ai_engine.rs        # Claude CLI orchestration
      session.rs          # Conversation/session management
      project.rs          # Project/workspace management
      filesystem.rs       # File operations, watching, diffing
      terminal.rs         # PTY management, shell processes
      events.rs           # Event bus definitions and dispatch

src/                      # React frontend (thin renderer)
  components/
    conversation/         # Chat stream, message rendering
    file-viewer/          # Code display, file tree
    terminal-output/      # Terminal emulator display
    layout/               # App shell, panels, status bar
    shared/               # Reusable primitives (TuiPanel, etc.)
  hooks/                  # Custom hooks (useTauriEvent, useTauriCommand)
  types/                  # TypeScript type definitions (mirror Rust types)
  lib/                    # Utilities (formatting, keyboard handling)
  stores/                 # Minimal UI-only state (Zustand)
```

---

## Code Review Checklist

Before any code is merged, verify:

- [ ] Types/interfaces defined before implementation
- [ ] Error handling uses Result/AppError, no unwraps in prod paths
- [ ] No business logic in the frontend
- [ ] State flows from Rust → Event → Frontend (never the reverse for domain state)
- [ ] No new dependencies without justification
- [ ] Functions are <40 lines and do one thing
- [ ] Naming follows project conventions
- [ ] No dead code, no TODOs without plans
- [ ] No hardcoded values — constants or config structs used
- [ ] No file exceeds size limits (Rust: 200, React: 150, Types: 100, CSS: 200 lines)

---

## Aesthetic Guidelines

Carry forward from the existing Liminal project:
- **Background:** Pure black (#000000)
- **Font:** Geist Mono, monospace stack
- **Borders:** Sharp (0px radius), subtle gray (#1e1e22)
- **Panels:** TUI-style with floating labels
- **Text:** Small sizes (10-13px), high contrast on black
- **Accents:** Cyan, purple, amber — used sparingly and with purpose
- **Interactions:** Keyboard-first, vim-inspired navigation
- **Animations:** Minimal — blinking cursors, subtle fades only
