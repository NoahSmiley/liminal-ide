# Liminal IDE Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-first terminal IDE where conversation is the primary interface and code is the output artifact.

**Architecture:** Rust-heavy Tauri 2 backend owns all state and logic (session, AI, filesystem, terminal, events). React frontend is a thin renderer that receives events and sends user input. Claude CLI subprocess provides AI.

**Tech Stack:** Tauri 2, Rust (tokio, serde, thiserror), React 19, TypeScript, Tailwind CSS 4, Zustand (UI-only state)

**Constraints:** Rust files max 200 lines, React components max 150 lines, type files max 100 lines. No `.unwrap()` in prod paths. No business logic in frontend. See CLAUDE.md for full rules.

---

## Task 1: Clean Scaffold — Remove Old Code, Set Up Directory Structure

The existing codebase is a project management tool (Hive). We need to strip it and create the new module structure while keeping Tauri config and build tooling.

**Files:**
- Delete: All files in `src/components/`, `src/pages/`, `src/stores/`, `src/hooks/`, `src/lib/`, `src/data/`, `src/types/`
- Delete: `server/` directory entirely (replaced by Tauri backend)
- Keep: `src-tauri/`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `components.json`
- Modify: `src-tauri/tauri.conf.json` — rename app to "Liminal"
- Modify: `src/App.tsx` — strip to minimal shell
- Modify: `src/main.tsx` — keep minimal React entry
- Modify: `src/index.css` — keep TUI theme, remove component-specific styles
- Create: Directory structure per CLAUDE.md

**Step 1: Delete old frontend code**

```bash
rm -rf src/components src/pages src/stores src/hooks src/lib src/data src/types
rm -rf server
```

**Step 2: Create new directory structure**

```bash
# Rust backend
mkdir -p src-tauri/src/commands
mkdir -p src-tauri/src/core

# React frontend
mkdir -p src/components/conversation
mkdir -p src/components/file-viewer
mkdir -p src/components/terminal-output
mkdir -p src/components/layout
mkdir -p src/components/shared
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/lib
mkdir -p src/stores
```

**Step 3: Update Tauri config**

Modify `src-tauri/tauri.conf.json`:
- Change `productName` from `"Hive"` to `"Liminal"`
- Change `identifier` from `"com.liminal.hive"` to `"com.liminal.ide"`
- Change window `title` from `"Hive"` to `"Liminal"`

**Step 4: Strip App.tsx to minimal shell**

```tsx
function App() {
  return (
    <div className="h-screen w-screen bg-black text-zinc-200 font-mono text-[13px]">
      <p className="p-4 text-zinc-500">liminal</p>
    </div>
  );
}

export default App;
```

**Step 5: Strip main.tsx to minimal entry**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 6: Strip index.css to core TUI theme only**

Keep only: Tailwind imports, font-face for Geist Mono, base body styles, CSS custom properties for colors, `.tui-panel` and `.tui-panel-title` classes, `.animate-blink` keyframes. Remove all component-specific styles.

**Step 7: Verify build**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
cd .. && pnpm build 2>&1 | tail -5
```
Expected: Both compile without errors.

**Step 8: Commit**

```bash
git add -A
git commit -m "Strip old Hive code, scaffold Liminal IDE directory structure"
```

---

## Task 2: Rust Foundation — Error Types and Config

Everything else depends on `AppError` and `Config`. Build these first.

**Files:**
- Create: `src-tauri/src/error.rs`
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/lib.rs` — declare modules
- Modify: `src-tauri/Cargo.toml` — add `thiserror`, `uuid`, `tokio`

**Step 1: Add Rust dependencies**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:
```toml
thiserror = "2"
uuid = { version = "1", features = ["v4", "serde"] }
tokio = { version = "1", features = ["full"] }
```

**Step 2: Write error.rs**

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("AI error: {0}")]
    Ai(#[from] AiError),

    #[error("File system error: {0}")]
    FileSystem(#[from] FsError),

    #[error("Terminal error: {0}")]
    Terminal(#[from] TermError),

    #[error("Session error: {0}")]
    Session(#[from] SessionError),

    #[error("Project error: {0}")]
    Project(#[from] ProjectError),
}

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Claude CLI not found — install with: npm i -g @anthropic-ai/claude-code")]
    CliNotFound,

    #[error("Claude CLI not authenticated — run: claude login")]
    NotAuthenticated,

    #[error("Claude process crashed: {0}")]
    ProcessCrashed(String),

    #[error("Stream corrupted: {0}")]
    StreamCorrupted(String),

    #[error("Rate limited — retry after {seconds}s")]
    RateLimited { seconds: u64 },

    #[error("Request timed out after {seconds}s")]
    Timeout { seconds: u64 },
}

#[derive(Error, Debug)]
pub enum FsError {
    #[error("File not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Path outside project directory: {0}")]
    OutsideProject(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Error, Debug)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    NotFound(String),

    #[error("Corrupted session history: {0}")]
    CorruptedHistory(String),

    #[error("Storage failed: {0}")]
    StorageFailed(String),
}

#[derive(Error, Debug)]
pub enum TermError {
    #[error("Failed to spawn shell: {0}")]
    SpawnFailed(String),

    #[error("Process hung — no output for {seconds}s")]
    ProcessHung { seconds: u64 },

    #[error("PTY unavailable: {0}")]
    PtyUnavailable(String),
}

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("Invalid project path: {0}")]
    InvalidPath(String),

    #[error("Project already open: {0}")]
    AlreadyOpen(String),

    #[error("Invalid config: {0}")]
    ConfigInvalid(String),
}

// Tauri commands require Serialize on errors
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

**Step 3: Write config.rs**

```rust
use std::path::PathBuf;

pub struct AppConfig {
    pub claude_model: String,
    pub claude_timeout_seconds: u64,
    pub data_dir: PathBuf,
}

impl Default for AppConfig {
    fn default() -> Self {
        let data_dir = dirs_next::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("liminal");

        Self {
            claude_model: "sonnet".to_string(),
            claude_timeout_seconds: 120,
            data_dir,
        }
    }
}
```

Note: add `dirs-next = "2"` to Cargo.toml for platform-appropriate data directory.

**Step 4: Update lib.rs with module declarations**

```rust
mod config;
mod error;
mod commands;
mod core;

pub use error::AppError;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 5: Create module stubs**

Create `src-tauri/src/commands/mod.rs`:
```rust
pub mod ai;
pub mod filesystem;
pub mod terminal;
pub mod session;
pub mod project;
```

Create `src-tauri/src/core/mod.rs`:
```rust
pub mod ai_engine;
pub mod events;
pub mod filesystem;
pub mod project;
pub mod session;
pub mod terminal;
```

Create stub files for each (empty for now — just enough to compile):
- `src-tauri/src/commands/ai.rs` — empty
- `src-tauri/src/commands/filesystem.rs` — empty
- `src-tauri/src/commands/terminal.rs` — empty
- `src-tauri/src/commands/session.rs` — empty
- `src-tauri/src/commands/project.rs` — empty
- `src-tauri/src/core/ai_engine.rs` — empty
- `src-tauri/src/core/events.rs` — empty
- `src-tauri/src/core/filesystem.rs` — empty
- `src-tauri/src/core/project.rs` — empty
- `src-tauri/src/core/session.rs` — empty
- `src-tauri/src/core/terminal.rs` — empty

**Step 6: Verify compilation**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```
Expected: Compiles with no errors (warnings for unused modules are fine).

**Step 7: Commit**

```bash
git add -A
git commit -m "Add error types, config, and module scaffolding for Rust backend"
```

---

## Task 3: Event Bus — Rust → Frontend Communication

The event bus is the nervous system. Build it before the modules that emit events.

**Files:**
- Create: `src-tauri/src/core/events.rs`
- Create: `src-tauri/src/core/events/mod.rs` (if splitting needed)

**Step 1: Write event type definitions**

`src-tauri/src/core/events.rs`:
```rust
use serde::Serialize;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum AppEvent {
    Ai(AiEvent),
    Fs(FsEvent),
    Terminal(TerminalEvent),
    Session(SessionEvent),
    Project(ProjectEvent),
    System(SystemEvent),
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum AiEvent {
    TextDelta { session_id: Uuid, content: String },
    ToolUse { session_id: Uuid, tool_id: String, name: String, input: String },
    ToolResult { session_id: Uuid, tool_id: String, output: String },
    TurnComplete { session_id: Uuid },
    Error { session_id: Uuid, message: String },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum FsEvent {
    FileCreated { path: String, content: String },
    FileModified { path: String, content: String },
    FileDeleted { path: String },
    TreeUpdated { root: String },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum TerminalEvent {
    Output { terminal_id: Uuid, data: String },
    Exit { terminal_id: Uuid, code: i32 },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum SessionEvent {
    Created { session_id: Uuid },
    MessageAdded { session_id: Uuid },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum ProjectEvent {
    Opened { project_id: Uuid, name: String },
    Closed { project_id: Uuid },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum SystemEvent {
    Ready,
    Error { message: String },
}
```

**Step 2: Write the EventBus emitter**

This is a thin wrapper around Tauri's `AppHandle::emit`. Create a separate file if events.rs approaches 200 lines, otherwise add to events.rs:

```rust
use tauri::AppHandle;

#[derive(Clone)]
pub struct EventBus {
    app_handle: AppHandle,
}

impl EventBus {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub fn emit(&self, event: AppEvent) {
        let event_name = match &event {
            AppEvent::Ai(_) => "ai:event",
            AppEvent::Fs(_) => "fs:event",
            AppEvent::Terminal(_) => "terminal:event",
            AppEvent::Session(_) => "session:event",
            AppEvent::Project(_) => "project:event",
            AppEvent::System(_) => "system:event",
        };

        // Log emission failures but don't panic
        if let Err(e) = self.app_handle.emit(event_name, &event) {
            eprintln!("Failed to emit event {}: {}", event_name, e);
        }
    }
}
```

**Step 3: Write test for event serialization**

Add to bottom of `events.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ai_event_serializes_with_tag() {
        let event = AppEvent::Ai(AiEvent::TextDelta {
            session_id: Uuid::nil(),
            content: "hello".to_string(),
        });
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"Ai\""));
        assert!(json.contains("\"kind\":\"TextDelta\""));
        assert!(json.contains("\"content\":\"hello\""));
    }

    #[test]
    fn fs_event_serializes_with_tag() {
        let event = AppEvent::Fs(FsEvent::FileCreated {
            path: "src/main.rs".to_string(),
            content: "fn main() {}".to_string(),
        });
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"Fs\""));
        assert!(json.contains("\"kind\":\"FileCreated\""));
    }
}
```

**Step 4: Run tests**

```bash
cd src-tauri && cargo test core::events::tests -- --nocapture
```
Expected: 2 tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "Add event bus with typed events for Rust-to-frontend communication"
```

---

## Task 4: AppState and Tauri Wiring

Create the shared `AppState` struct that holds all managers, wire it into Tauri's managed state.

**Files:**
- Create: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs` — register state, add `tauri::ipc::Channel` capability

**Step 1: Write state.rs**

```rust
use crate::config::AppConfig;
use crate::core::events::EventBus;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            config: AppConfig::default(),
            event_bus,
        }
    }
}
```

**Step 2: Update lib.rs to wire state into Tauri**

```rust
mod config;
mod error;
mod state;
mod commands;
mod core;

pub use error::AppError;

use core::events::EventBus;
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let event_bus = EventBus::new(app.handle().clone());
            let state = AppState::new(event_bus);
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: Update Tauri capabilities for event listening**

Modify `src-tauri/capabilities/default.json` to add event permissions:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit"
  ]
}
```

**Step 4: Verify compilation**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```
Expected: Compiles without errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "Add AppState with EventBus, wire into Tauri managed state"
```

---

## Task 5: Project Manager — Create and Open Projects

Users need to create/open projects before doing anything else.

**Files:**
- Write: `src-tauri/src/core/project.rs`
- Write: `src-tauri/src/commands/project.rs`
- Modify: `src-tauri/src/state.rs` — add ProjectManager
- Modify: `src-tauri/src/lib.rs` — register commands

**Step 1: Write project types and manager**

`src-tauri/src/core/project.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::ProjectError;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub root_path: PathBuf,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub root_path: String,
}

pub struct ProjectManager {
    projects: Mutex<HashMap<Uuid, Project>>,
    active_project: Mutex<Option<Uuid>>,
}

impl ProjectManager {
    pub fn new() -> Self {
        Self {
            projects: Mutex::new(HashMap::new()),
            active_project: Mutex::new(None),
        }
    }

    pub async fn create_project(
        &self,
        name: String,
        path: PathBuf,
    ) -> Result<Project, ProjectError> {
        if !path.exists() {
            std::fs::create_dir_all(&path)
                .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;
        }

        let project = Project {
            id: Uuid::new_v4(),
            name,
            root_path: path,
        };

        let mut projects = self.projects.lock().await;
        projects.insert(project.id, project.clone());

        let mut active = self.active_project.lock().await;
        *active = Some(project.id);

        Ok(project)
    }

    pub async fn open_project(
        &self,
        path: PathBuf,
    ) -> Result<Project, ProjectError> {
        if !path.exists() {
            return Err(ProjectError::InvalidPath(
                format!("Path does not exist: {}", path.display()),
            ));
        }

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled".to_string());

        self.create_project(name, path).await
    }

    pub async fn get_active(&self) -> Option<Project> {
        let active_id = self.active_project.lock().await;
        let projects = self.projects.lock().await;
        active_id.and_then(|id| projects.get(&id).cloned())
    }

    pub async fn list_projects(&self) -> Vec<ProjectSummary> {
        let projects = self.projects.lock().await;
        projects
            .values()
            .map(|p| ProjectSummary {
                id: p.id,
                name: p.name.clone(),
                root_path: p.root_path.display().to_string(),
            })
            .collect()
    }
}
```

**Step 2: Write tests for ProjectManager**

Add to bottom of `core/project.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[tokio::test]
    async fn create_project_sets_active() {
        let mgr = ProjectManager::new();
        let tmp = env::temp_dir().join("liminal-test-create");
        let project = mgr.create_project("test".into(), tmp.clone()).await.unwrap();
        let active = mgr.get_active().await.unwrap();
        assert_eq!(active.id, project.id);
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[tokio::test]
    async fn open_nonexistent_path_fails() {
        let mgr = ProjectManager::new();
        let result = mgr.open_project("/nonexistent/path".into()).await;
        assert!(result.is_err());
    }
}
```

**Step 3: Run tests**

```bash
cd src-tauri && cargo test core::project::tests -- --nocapture
```
Expected: 2 tests pass.

**Step 4: Write Tauri commands**

`src-tauri/src/commands/project.rs`:
```rust
use std::path::PathBuf;
use tauri::State;

use crate::error::AppError;
use crate::core::project::{Project, ProjectSummary};
use crate::state::AppState;

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .create_project(name, PathBuf::from(path))
        .await?;
    Ok(project)
}

#[tauri::command]
pub async fn open_project(
    state: State<'_, AppState>,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .open_project(PathBuf::from(path))
        .await?;
    Ok(project)
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
) -> Result<Vec<ProjectSummary>, AppError> {
    let projects = state.project_manager.list_projects().await;
    Ok(projects)
}

#[tauri::command]
pub async fn get_active_project(
    state: State<'_, AppState>,
) -> Result<Option<Project>, AppError> {
    let project = state.project_manager.get_active().await;
    Ok(project)
}
```

**Step 5: Update state.rs to include ProjectManager**

```rust
use crate::config::AppConfig;
use crate::core::events::EventBus;
use crate::core::project::ProjectManager;

pub struct AppState {
    pub config: AppConfig,
    pub event_bus: EventBus,
    pub project_manager: ProjectManager,
}

impl AppState {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            config: AppConfig::default(),
            event_bus,
            project_manager: ProjectManager::new(),
        }
    }
}
```

**Step 6: Register commands in lib.rs**

Update the `tauri::Builder` chain in `lib.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    commands::project::create_project,
    commands::project::open_project,
    commands::project::list_projects,
    commands::project::get_active_project,
])
```

**Step 7: Verify compilation + tests**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
cd src-tauri && cargo test -- --nocapture 2>&1 | tail -10
```

**Step 8: Commit**

```bash
git add -A
git commit -m "Add ProjectManager with create/open/list and Tauri commands"
```

---

## Task 6: File System Module — Sandboxed File Operations

All file I/O funneled through one module. Paths sandboxed to project directory.

**Files:**
- Write: `src-tauri/src/core/filesystem.rs`
- Write: `src-tauri/src/commands/filesystem.rs`
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write filesystem types and core logic**

`src-tauri/src/core/filesystem.rs`:
```rust
use serde::Serialize;
use std::path::{Path, PathBuf};

use crate::error::FsError;

#[derive(Clone, Debug, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

pub struct FileSystemManager;

impl FileSystemManager {
    pub fn new() -> Self {
        Self
    }

    pub fn validate_path(
        &self,
        project_root: &Path,
        target: &Path,
    ) -> Result<PathBuf, FsError> {
        let absolute = if target.is_absolute() {
            target.to_path_buf()
        } else {
            project_root.join(target)
        };

        let canonical_root = project_root
            .canonicalize()
            .map_err(|e| FsError::Io(e))?;
        let canonical_target = absolute
            .canonicalize()
            .unwrap_or_else(|_| absolute.clone());

        if !canonical_target.starts_with(&canonical_root) {
            return Err(FsError::OutsideProject(
                target.display().to_string(),
            ));
        }

        Ok(absolute)
    }

    pub fn read_file(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<FileContent, FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        let content = std::fs::read_to_string(&safe_path)
            .map_err(|_| FsError::NotFound(path.display().to_string()))?;
        Ok(FileContent {
            path: path.display().to_string(),
            content,
        })
    }

    pub fn write_file(
        &self,
        project_root: &Path,
        path: &Path,
        content: &str,
    ) -> Result<(), FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        if let Some(parent) = safe_path.parent() {
            std::fs::create_dir_all(parent).map_err(FsError::Io)?;
        }
        std::fs::write(&safe_path, content).map_err(FsError::Io)?;
        Ok(())
    }

    pub fn delete_file(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<(), FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        std::fs::remove_file(&safe_path)
            .map_err(|_| FsError::NotFound(path.display().to_string()))?;
        Ok(())
    }

    pub fn list_directory(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<Vec<DirEntry>, FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        let mut entries = Vec::new();
        let read_dir = std::fs::read_dir(&safe_path).map_err(FsError::Io)?;

        for entry in read_dir {
            let entry = entry.map_err(FsError::Io)?;
            let metadata = entry.metadata().map_err(FsError::Io)?;
            entries.push(DirEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().display().to_string(),
                is_dir: metadata.is_dir(),
            });
        }

        entries.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
        });
        Ok(entries)
    }
}
```

**Step 2: Write tests**

Add to bottom of `core/filesystem.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn setup_test_dir() -> PathBuf {
        let dir = env::temp_dir().join("liminal-fs-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_and_read_file() {
        let root = setup_test_dir();
        let fs = FileSystemManager::new();
        fs.write_file(&root, Path::new("test.txt"), "hello").unwrap();
        let content = fs.read_file(&root, Path::new("test.txt")).unwrap();
        assert_eq!(content.content, "hello");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn rejects_path_outside_project() {
        let root = setup_test_dir();
        let fs = FileSystemManager::new();
        let result = fs.read_file(&root, Path::new("/etc/passwd"));
        assert!(result.is_err());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn list_directory_sorts_dirs_first() {
        let root = setup_test_dir();
        let fs = FileSystemManager::new();
        std::fs::create_dir(root.join("subdir")).unwrap();
        std::fs::write(root.join("file.txt"), "x").unwrap();
        let entries = fs.list_directory(&root, Path::new(".")).unwrap();
        assert!(entries[0].is_dir);
        assert!(!entries[1].is_dir);
        let _ = std::fs::remove_dir_all(&root);
    }
}
```

**Step 3: Run tests**

```bash
cd src-tauri && cargo test core::filesystem::tests -- --nocapture
```
Expected: 3 tests pass.

**Step 4: Write Tauri commands**

`src-tauri/src/commands/filesystem.rs`:
```rust
use std::path::Path;
use tauri::State;

use crate::core::filesystem::{DirEntry, FileContent};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn read_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<FileContent, AppError> {
    let project = state.project_manager.get_active().await
        .ok_or(AppError::Project(crate::error::ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let content = state.fs_manager.read_file(
        &project.root_path,
        Path::new(&path),
    )?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let project = state.project_manager.get_active().await
        .ok_or(AppError::Project(crate::error::ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    state.fs_manager.write_file(
        &project.root_path,
        Path::new(&path),
        &content,
    )?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<DirEntry>, AppError> {
    let project = state.project_manager.get_active().await
        .ok_or(AppError::Project(crate::error::ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let entries = state.fs_manager.list_directory(
        &project.root_path,
        Path::new(&path),
    )?;
    Ok(entries)
}
```

**Step 5: Add FileSystemManager to AppState, register commands**

Update `state.rs` to add `pub fs_manager: FileSystemManager`.
Register `read_file`, `write_file`, `list_directory` in `lib.rs` invoke_handler.

**Step 6: Verify compilation + tests**

```bash
cd src-tauri && cargo build && cargo test -- --nocapture 2>&1 | tail -15
```

**Step 7: Commit**

```bash
git add -A
git commit -m "Add sandboxed FileSystem module with path validation and Tauri commands"
```

---

## Task 7: Session Manager — Conversation Persistence

Sessions hold message history. In-memory for now, SQLite persistence in a follow-up.

**Files:**
- Write: `src-tauri/src/core/session.rs`
- Write: `src-tauri/src/commands/session.rs`
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write session types and manager**

`src-tauri/src/core/session.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::SessionError;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Session {
    pub id: Uuid,
    pub project_id: Uuid,
    pub messages: Vec<Message>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SessionSummary {
    pub id: Uuid,
    pub project_id: Uuid,
    pub message_count: usize,
    pub preview: String,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<Uuid, Session>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn create_session(
        &self,
        project_id: Uuid,
    ) -> Session {
        let session = Session {
            id: Uuid::new_v4(),
            project_id,
            messages: Vec::new(),
        };
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session.id, session.clone());
        session
    }

    pub async fn append_message(
        &self,
        session_id: Uuid,
        message: Message,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(&session_id)
            .ok_or(SessionError::NotFound(session_id.to_string()))?;
        session.messages.push(message);
        Ok(())
    }

    pub async fn get_session(
        &self,
        session_id: Uuid,
    ) -> Result<Session, SessionError> {
        let sessions = self.sessions.lock().await;
        sessions
            .get(&session_id)
            .cloned()
            .ok_or(SessionError::NotFound(session_id.to_string()))
    }

    pub async fn list_sessions(
        &self,
        project_id: Uuid,
    ) -> Vec<SessionSummary> {
        let sessions = self.sessions.lock().await;
        sessions
            .values()
            .filter(|s| s.project_id == project_id)
            .map(|s| SessionSummary {
                id: s.id,
                project_id: s.project_id,
                message_count: s.messages.len(),
                preview: s.messages
                    .first()
                    .map(|m| m.content.chars().take(80).collect())
                    .unwrap_or_default(),
            })
            .collect()
    }
}
```

**Step 2: Write tests**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn create_and_retrieve_session() {
        let mgr = SessionManager::new();
        let project_id = Uuid::new_v4();
        let session = mgr.create_session(project_id).await;
        let retrieved = mgr.get_session(session.id).await.unwrap();
        assert_eq!(retrieved.id, session.id);
    }

    #[tokio::test]
    async fn append_message_to_session() {
        let mgr = SessionManager::new();
        let session = mgr.create_session(Uuid::new_v4()).await;
        mgr.append_message(session.id, Message {
            role: Role::User,
            content: "hello".into(),
        }).await.unwrap();
        let updated = mgr.get_session(session.id).await.unwrap();
        assert_eq!(updated.messages.len(), 1);
        assert_eq!(updated.messages[0].content, "hello");
    }

    #[tokio::test]
    async fn get_nonexistent_session_fails() {
        let mgr = SessionManager::new();
        let result = mgr.get_session(Uuid::new_v4()).await;
        assert!(result.is_err());
    }
}
```

**Step 3: Run tests**

```bash
cd src-tauri && cargo test core::session::tests -- --nocapture
```
Expected: 3 tests pass.

**Step 4: Write Tauri commands, update state, register**

`src-tauri/src/commands/session.rs`:
```rust
use tauri::State;
use uuid::Uuid;

use crate::core::session::{Session, SessionSummary};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    project_id: Uuid,
) -> Result<Session, AppError> {
    let session = state.session_manager.create_session(project_id).await;
    Ok(session)
}

#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
    session_id: Uuid,
) -> Result<Session, AppError> {
    let session = state.session_manager.get_session(session_id).await?;
    Ok(session)
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    project_id: Uuid,
) -> Result<Vec<SessionSummary>, AppError> {
    let sessions = state.session_manager.list_sessions(project_id).await;
    Ok(sessions)
}
```

Add `pub session_manager: SessionManager` to `AppState`. Register commands in `lib.rs`.

**Step 5: Verify + Commit**

```bash
cd src-tauri && cargo build && cargo test -- --nocapture
git add -A
git commit -m "Add SessionManager with message history and Tauri commands"
```

---

## Task 8: AI Engine — Claude CLI Integration

The core feature. Spawns Claude CLI, streams responses, routes tool calls.

**Files:**
- Write: `src-tauri/src/core/ai_engine/mod.rs`
- Write: `src-tauri/src/core/ai_engine/streaming.rs`
- Write: `src-tauri/src/core/ai_engine/types.rs`
- Write: `src-tauri/src/commands/ai.rs`
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

Note: `ai_engine` is split into submodules from the start because it's the most complex module.

**Step 1: Write AI types**

`src-tauri/src/core/ai_engine/types.rs`:
```rust
use serde::Deserialize;

/// Raw JSON events from Claude CLI --output-format stream-json
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClaudeStreamEvent {
    #[serde(rename = "assistant")]
    Assistant { message: AssistantMessage },

    #[serde(rename = "content_block_start")]
    ContentBlockStart { index: usize, content_block: ContentBlock },

    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { index: usize, delta: Delta },

    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: usize },

    #[serde(rename = "message_start")]
    MessageStart {},

    #[serde(rename = "message_stop")]
    MessageStop {},

    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
pub struct AssistantMessage {
    pub content: Option<Vec<ContentBlock>>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },

    #[serde(rename = "tool_use")]
    ToolUse { id: String, name: String, input: serde_json::Value },

    #[serde(other)]
    Unknown,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum Delta {
    #[serde(rename = "text_delta")]
    TextDelta { text: String },

    #[serde(rename = "input_json_delta")]
    InputJsonDelta { partial_json: String },

    #[serde(other)]
    Unknown,
}
```

**Step 2: Write the streaming parser**

`src-tauri/src/core/ai_engine/streaming.rs`:
```rust
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use uuid::Uuid;

use crate::core::events::{AiEvent, EventBus, AppEvent};
use crate::error::AiError;
use super::types::{ClaudeStreamEvent, Delta};

pub async fn stream_claude_response(
    event_bus: &EventBus,
    session_id: Uuid,
    prompt: &str,
    system_prompt: &str,
    model: &str,
) -> Result<String, AiError> {
    let mut child = Command::new("claude")
        .args([
            "--output-format", "stream-json",
            "--model", model,
            "--verbose",
            "--system-prompt", system_prompt,
            "--prompt", prompt,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| AiError::CliNotFound)?;

    let stdout = child.stdout.take()
        .ok_or(AiError::ProcessCrashed("No stdout".into()))?;

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut full_response = String::new();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<ClaudeStreamEvent>(&line) {
            Ok(event) => {
                handle_stream_event(
                    event_bus, session_id, &event, &mut full_response,
                );
            }
            Err(_) => continue, // skip unparseable lines
        }
    }

    let status = child.wait().await
        .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

    if !status.success() {
        return Err(AiError::ProcessCrashed(
            format!("Claude exited with code: {}", status),
        ));
    }

    event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
    Ok(full_response)
}

fn handle_stream_event(
    event_bus: &EventBus,
    session_id: Uuid,
    event: &ClaudeStreamEvent,
    full_response: &mut String,
) {
    match event {
        ClaudeStreamEvent::ContentBlockDelta { delta, .. } => {
            if let Delta::TextDelta { text } = delta {
                full_response.push_str(text);
                event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
                    session_id,
                    content: text.clone(),
                }));
            }
        }
        ClaudeStreamEvent::ContentBlockStart { content_block, .. } => {
            if let super::types::ContentBlock::ToolUse { id, name, input } = content_block {
                event_bus.emit(AppEvent::Ai(AiEvent::ToolUse {
                    session_id,
                    tool_id: id.clone(),
                    name: name.clone(),
                    input: input.to_string(),
                }));
            }
        }
        _ => {}
    }
}
```

**Step 3: Write the engine facade**

`src-tauri/src/core/ai_engine/mod.rs`:
```rust
pub mod streaming;
pub mod types;

use uuid::Uuid;

use crate::core::events::EventBus;
use crate::core::session::{Message, Role, SessionManager};
use crate::error::AiError;

const DEFAULT_SYSTEM_PROMPT: &str =
    "You are Liminal, an AI coding assistant inside a terminal IDE. \
     You help users build software by writing code, creating files, \
     and running commands. Be concise and direct.";

pub struct AiEngine {
    model: String,
}

impl AiEngine {
    pub fn new(model: String) -> Self {
        Self { model }
    }

    pub async fn send_message(
        &self,
        event_bus: &EventBus,
        session_manager: &SessionManager,
        session_id: Uuid,
        user_message: String,
    ) -> Result<(), AiError> {
        session_manager
            .append_message(session_id, Message {
                role: Role::User,
                content: user_message.clone(),
            })
            .await
            .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

        let response = streaming::stream_claude_response(
            event_bus,
            session_id,
            &user_message,
            DEFAULT_SYSTEM_PROMPT,
            &self.model,
        )
        .await?;

        session_manager
            .append_message(session_id, Message {
                role: Role::Assistant,
                content: response,
            })
            .await
            .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

        Ok(())
    }

    pub fn check_availability() -> bool {
        std::process::Command::new("claude")
            .arg("--version")
            .output()
            .is_ok()
    }
}
```

**Step 4: Write Tauri commands**

`src-tauri/src/commands/ai.rs`:
```rust
use tauri::State;
use uuid::Uuid;

use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    session_id: Uuid,
    content: String,
) -> Result<(), AppError> {
    state.ai_engine.send_message(
        &state.event_bus,
        &state.session_manager,
        session_id,
        content,
    ).await?;
    Ok(())
}

#[tauri::command]
pub async fn check_claude_status() -> Result<bool, AppError> {
    Ok(crate::core::ai_engine::AiEngine::check_availability())
}
```

**Step 5: Add AiEngine to AppState, register commands**

Add `pub ai_engine: AiEngine` to `AppState`. Initialize with `AiEngine::new(config.claude_model.clone())`. Register `send_message`, `check_claude_status` in invoke_handler.

**Step 6: Verify compilation**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

**Step 7: Commit**

```bash
git add -A
git commit -m "Add AI engine with Claude CLI streaming and Tauri commands"
```

---

## Task 9: Terminal Manager — PTY Shell Execution

Manages shell processes for running commands.

**Files:**
- Write: `src-tauri/src/core/terminal.rs`
- Write: `src-tauri/src/commands/terminal.rs`
- Modify: `src-tauri/Cargo.toml` — add `portable-pty`
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add portable-pty dependency**

Add to `Cargo.toml`:
```toml
portable-pty = "0.8"
```

**Step 2: Write terminal manager**

`src-tauri/src/core/terminal.rs`:
```rust
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::core::events::{AppEvent, EventBus, TerminalEvent};
use crate::error::TermError;

struct TerminalInstance {
    writer: Box<dyn Write + Send>,
    // child handle kept alive
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct TerminalManager {
    terminals: Mutex<HashMap<Uuid, TerminalInstance>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            terminals: Mutex::new(HashMap::new()),
        }
    }

    pub async fn spawn_shell(
        &self,
        project_dir: PathBuf,
        event_bus: EventBus,
    ) -> Result<Uuid, TermError> {
        let terminal_id = Uuid::new_v4();
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let mut cmd = CommandBuilder::new_default_prog();
        cmd.cwd(&project_dir);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;

        let tid = terminal_id;
        tokio::task::spawn_blocking(move || {
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        event_bus.emit(AppEvent::Terminal(
                            TerminalEvent::Exit { terminal_id: tid, code: 0 },
                        ));
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        event_bus.emit(AppEvent::Terminal(
                            TerminalEvent::Output { terminal_id: tid, data },
                        ));
                    }
                    Err(_) => break,
                }
            }
        });

        let instance = TerminalInstance { writer, _child: child };
        self.terminals.lock().await.insert(terminal_id, instance);
        Ok(terminal_id)
    }

    pub async fn send_input(
        &self,
        terminal_id: Uuid,
        input: &str,
    ) -> Result<(), TermError> {
        let mut terminals = self.terminals.lock().await;
        let terminal = terminals
            .get_mut(&terminal_id)
            .ok_or(TermError::SpawnFailed(
                format!("Terminal {} not found", terminal_id),
            ))?;
        terminal
            .writer
            .write_all(input.as_bytes())
            .map_err(|e| TermError::SpawnFailed(e.to_string()))?;
        Ok(())
    }

    pub async fn kill(&self, terminal_id: Uuid) -> Result<(), TermError> {
        let mut terminals = self.terminals.lock().await;
        terminals.remove(&terminal_id);
        Ok(())
    }
}
```

**Step 3: Write Tauri commands**

`src-tauri/src/commands/terminal.rs`:
```rust
use tauri::State;
use uuid::Uuid;

use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn spawn_terminal(
    state: State<'_, AppState>,
) -> Result<Uuid, AppError> {
    let project = state.project_manager.get_active().await
        .ok_or(AppError::Project(crate::error::ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let id = state.terminal_manager.spawn_shell(
        project.root_path,
        state.event_bus.clone(),
    ).await?;
    Ok(id)
}

#[tauri::command]
pub async fn send_terminal_input(
    state: State<'_, AppState>,
    terminal_id: Uuid,
    input: String,
) -> Result<(), AppError> {
    state.terminal_manager.send_input(terminal_id, &input).await?;
    Ok(())
}

#[tauri::command]
pub async fn kill_terminal(
    state: State<'_, AppState>,
    terminal_id: Uuid,
) -> Result<(), AppError> {
    state.terminal_manager.kill(terminal_id).await?;
    Ok(())
}
```

**Step 4: Add TerminalManager to AppState, register commands**

Add `pub terminal_manager: TerminalManager` to `AppState`. Register commands.

**Step 5: Verify compilation**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

**Step 6: Commit**

```bash
git add -A
git commit -m "Add TerminalManager with PTY shell spawning and Tauri commands"
```

---

## Task 10: Frontend — TypeScript Types (Mirror Rust)

Define all types the frontend needs. These mirror the Rust types exactly.

**Files:**
- Create: `src/types/ai-types.ts`
- Create: `src/types/fs-types.ts`
- Create: `src/types/session-types.ts`
- Create: `src/types/project-types.ts`
- Create: `src/types/terminal-types.ts`
- Create: `src/types/event-types.ts`

**Step 1: Write all type files**

`src/types/ai-types.ts`:
```typescript
export type AiEvent =
  | { kind: "TextDelta"; session_id: string; content: string }
  | { kind: "ToolUse"; session_id: string; tool_id: string; name: string; input: string }
  | { kind: "ToolResult"; session_id: string; tool_id: string; output: string }
  | { kind: "TurnComplete"; session_id: string }
  | { kind: "Error"; session_id: string; message: string };
```

`src/types/fs-types.ts`:
```typescript
export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface FileContent {
  path: string;
  content: string;
}

export type FsEvent =
  | { kind: "FileCreated"; path: string; content: string }
  | { kind: "FileModified"; path: string; content: string }
  | { kind: "FileDeleted"; path: string }
  | { kind: "TreeUpdated"; root: string };
```

`src/types/session-types.ts`:
```typescript
export type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface Session {
  id: string;
  project_id: string;
  messages: Message[];
}

export interface SessionSummary {
  id: string;
  project_id: string;
  message_count: number;
  preview: string;
}
```

`src/types/project-types.ts`:
```typescript
export interface Project {
  id: string;
  name: string;
  root_path: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  root_path: string;
}
```

`src/types/terminal-types.ts`:
```typescript
export type TerminalEvent =
  | { kind: "Output"; terminal_id: string; data: string }
  | { kind: "Exit"; terminal_id: string; code: number };
```

`src/types/event-types.ts`:
```typescript
import type { AiEvent } from "./ai-types";
import type { FsEvent } from "./fs-types";
import type { TerminalEvent } from "./terminal-types";

export type AppEvent =
  | { type: "Ai"; payload: AiEvent }
  | { type: "Fs"; payload: FsEvent }
  | { type: "Terminal"; payload: TerminalEvent }
  | { type: "System"; payload: SystemEvent };

export type SystemEvent =
  | { kind: "Ready" }
  | { kind: "Error"; message: string };
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -10
```

**Step 3: Commit**

```bash
git add -A
git commit -m "Add TypeScript types mirroring Rust event and data structures"
```

---

## Task 11: Frontend — Tauri Hooks

Generic hooks for communicating with the Rust backend.

**Files:**
- Create: `src/hooks/use-tauri-event.ts`
- Create: `src/hooks/use-tauri-command.ts`

**Step 1: Write useTauriEvent hook**

`src/hooks/use-tauri-event.ts`:
```typescript
import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<T>(eventName, (event) => {
      handler(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [eventName, handler]);
}
```

**Step 2: Write useTauriCommand hook**

`src/hooks/use-tauri-command.ts`:
```typescript
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

interface CommandState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useTauriCommand<T>(command: string) {
  const [state, setState] = useState<CommandState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (args?: Record<string, unknown>): Promise<T | null> => {
      setState({ data: null, error: null, loading: true });
      try {
        const result = await invoke<T>(command, args);
        setState({ data: result, error: null, loading: false });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState({ data: null, error: message, loading: false });
        return null;
      }
    },
    [command],
  );

  return { ...state, execute };
}
```

**Step 3: Verify compilation**

```bash
pnpm exec tsc --noEmit 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add -A
git commit -m "Add useTauriEvent and useTauriCommand hooks for Rust IPC"
```

---

## Task 12: Frontend — UI Store (Ephemeral State Only)

Minimal Zustand store for UI-only state. No domain data.

**Files:**
- Create: `src/stores/ui-store.ts`

**Step 1: Write the store**

`src/stores/ui-store.ts`:
```typescript
import { create } from "zustand";

interface PanelState {
  fileTreeOpen: boolean;
  terminalOpen: boolean;
}

interface UiState {
  panels: PanelState;
  inputFocused: boolean;
  toggleFileTree: () => void;
  toggleTerminal: () => void;
  setInputFocused: (focused: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  panels: {
    fileTreeOpen: false,
    terminalOpen: false,
  },
  inputFocused: true,
  toggleFileTree: () =>
    set((s) => ({
      panels: { ...s.panels, fileTreeOpen: !s.panels.fileTreeOpen },
    })),
  toggleTerminal: () =>
    set((s) => ({
      panels: { ...s.panels, terminalOpen: !s.panels.terminalOpen },
    })),
  setInputFocused: (focused) => set({ inputFocused: focused }),
}));
```

**Step 2: Commit**

```bash
git add -A
git commit -m "Add minimal UI store for panel visibility and input focus"
```

---

## Task 13: Frontend — Layout Shell

The app shell: status bar, main content area, input bar.

**Files:**
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/status-bar.tsx`
- Create: `src/components/layout/input-bar.tsx`
- Modify: `src/App.tsx`

**Step 1: Write status-bar.tsx**

```tsx
interface StatusBarProps {
  projectName: string | null;
  claudeAvailable: boolean;
}

export function StatusBar({ projectName, claudeAvailable }: StatusBarProps) {
  const path = projectName ? `~/liminal/${projectName}` : "~/liminal";
  const status = claudeAvailable ? "◆" : "○";
  const statusColor = claudeAvailable ? "text-cyan-400" : "text-zinc-600";

  return (
    <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800 text-[11px]">
      <span className="text-zinc-500">
        {path}
        <span className="animate-blink ml-0.5 text-zinc-600">▊</span>
      </span>
      <span className={statusColor}>
        {status} claude
      </span>
    </div>
  );
}
```

**Step 2: Write input-bar.tsx**

```tsx
import { useState, useRef, useEffect } from "react";

interface InputBarProps {
  onSubmit: (input: string) => void;
  disabled: boolean;
}

export function InputBar({ onSubmit, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="flex items-center px-3 py-2 border-t border-zinc-800">
      <span className="text-zinc-600 mr-2 text-[12px]">$</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        disabled={disabled}
        className="flex-1 bg-transparent text-zinc-200 text-[13px] outline-none placeholder:text-zinc-700"
        placeholder={disabled ? "waiting..." : "ask anything, !cmd, or /help"}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
```

**Step 3: Write app-shell.tsx**

```tsx
import { useState } from "react";
import { StatusBar } from "./status-bar";
import { InputBar } from "./input-bar";

export function AppShell() {
  const [projectName] = useState<string | null>(null);

  const handleInput = (input: string) => {
    console.log("input:", input);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 font-mono text-[13px]">
      <StatusBar projectName={projectName} claudeAvailable={false} />
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-zinc-600 text-[12px]">
          no project open — type /new or /open to start
        </p>
      </main>
      <InputBar onSubmit={handleInput} disabled={false} />
    </div>
  );
}
```

**Step 4: Update App.tsx**

```tsx
import { AppShell } from "./components/layout/app-shell";

function App() {
  return <AppShell />;
}

export default App;
```

**Step 5: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

**Step 6: Commit**

```bash
git add -A
git commit -m "Add layout shell with status bar, input bar, and app shell"
```

---

## Task 14: Frontend — Conversation Stream

The core UI: rendering the chat between user and AI.

**Files:**
- Create: `src/components/conversation/conversation-stream.tsx`
- Create: `src/components/conversation/message-bubble.tsx`
- Create: `src/components/conversation/code-block.tsx`
- Create: `src/hooks/use-conversation.ts`

**Step 1: Write useConversation hook**

`src/hooks/use-conversation.ts`:
```typescript
import { useCallback, useState } from "react";
import type { AiEvent } from "../types/ai-types";
import type { Message } from "../types/session-types";
import { useTauriEvent } from "./use-tauri-event";

export function useConversation(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);

  const handleAiEvent = useCallback(
    (event: { type: "Ai"; payload: AiEvent }) => {
      const payload = event.payload;
      if (sessionId && payload.session_id !== sessionId) return;

      switch (payload.kind) {
        case "TextDelta":
          setStreaming(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + payload.content },
              ];
            }
            return [...prev, { role: "assistant", content: payload.content }];
          });
          break;
        case "TurnComplete":
          setStreaming(false);
          break;
        case "Error":
          setStreaming(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `◆ error: ${payload.message}` },
          ]);
          break;
      }
    },
    [sessionId],
  );

  useTauriEvent("ai:event", handleAiEvent);

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
  }, []);

  return { messages, streaming, addUserMessage };
}
```

**Step 2: Write code-block.tsx**

```tsx
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  filename?: string;
}

export function CodeBlock({ code, filename }: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-zinc-800 my-2">
      <div
        className="flex items-center justify-between px-3 py-1 bg-zinc-950 text-[10px] text-zinc-500 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{filename ?? "code"}</span>
        <span>{collapsed ? "▾" : "▴"}</span>
      </div>
      {!collapsed && (
        <pre className="px-3 py-2 text-[12px] text-zinc-300 overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
```

**Step 3: Write message-bubble.tsx**

```tsx
import type { Message } from "../../types/session-types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className="mb-3">
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-zinc-600 w-4 shrink-0 pt-0.5">
          {isUser ? ">" : "◆"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-300 whitespace-pre-wrap break-words text-[13px]">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Write conversation-stream.tsx**

```tsx
import { useEffect, useRef } from "react";
import type { Message } from "../../types/session-types";
import { MessageBubble } from "./message-bubble";

interface ConversationStreamProps {
  messages: Message[];
  streaming: boolean;
}

export function ConversationStream({
  messages,
  streaming,
}: ConversationStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-zinc-600 text-[12px]">
        start a conversation — type below
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      {streaming && (
        <span className="text-zinc-600 text-[11px] animate-blink">▊</span>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

**Step 5: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

**Step 6: Commit**

```bash
git add -A
git commit -m "Add conversation stream components and useConversation hook"
```

---

## Task 15: Frontend — File Tree Panel

Side panel showing project file structure.

**Files:**
- Create: `src/components/file-viewer/file-tree.tsx`
- Create: `src/components/shared/tui-panel.tsx`
- Create: `src/hooks/use-file-tree.ts`

**Step 1: Write TuiPanel shared component**

`src/components/shared/tui-panel.tsx`:
```tsx
import type { ReactNode } from "react";

interface TuiPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function TuiPanel({ title, children, className = "" }: TuiPanelProps) {
  return (
    <div className={`relative border border-zinc-800 ${className}`}>
      <div className="absolute -top-2 left-3 px-1 bg-black text-[10px] text-zinc-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="p-3 pt-3">{children}</div>
    </div>
  );
}
```

**Step 2: Write useFileTree hook**

`src/hooks/use-file-tree.ts`:
```typescript
import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DirEntry } from "../types/fs-types";
import { useTauriEvent } from "./use-tauri-event";

export function useFileTree() {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (path = ".") => {
    try {
      const result = await invoke<DirEntry[]>("list_directory", { path });
      setEntries(result);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleFsEvent = useCallback(() => {
    refresh();
  }, [refresh]);

  useTauriEvent("fs:event", handleFsEvent);

  return { entries, error, refresh };
}
```

**Step 3: Write file-tree.tsx**

`src/components/file-viewer/file-tree.tsx`:
```tsx
import type { DirEntry } from "../../types/fs-types";

interface FileTreeProps {
  entries: DirEntry[];
  onSelect: (entry: DirEntry) => void;
}

export function FileTree({ entries, onSelect }: FileTreeProps) {
  return (
    <div className="text-[12px]">
      {entries.map((entry) => (
        <div
          key={entry.path}
          className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-zinc-900"
          onClick={() => onSelect(entry)}
        >
          <span className="text-zinc-600 w-3">
            {entry.is_dir ? "▸" : " "}
          </span>
          <span className={entry.is_dir ? "text-cyan-400" : "text-zinc-400"}>
            {entry.name}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Verify build + Commit**

```bash
pnpm build 2>&1 | tail -5
git add -A
git commit -m "Add file tree panel with TUI panel wrapper and useFileTree hook"
```

---

## Task 16: Frontend — Terminal Output Panel

Bottom panel showing live terminal output.

**Files:**
- Create: `src/components/terminal-output/terminal-panel.tsx`
- Create: `src/hooks/use-terminal.ts`

**Step 1: Write useTerminal hook**

`src/hooks/use-terminal.ts`:
```typescript
import { useCallback, useState } from "react";
import type { TerminalEvent } from "../types/terminal-types";
import { useTauriEvent } from "./use-tauri-event";

export function useTerminal(terminalId: string | null) {
  const [output, setOutput] = useState("");
  const [exited, setExited] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  const handleTerminalEvent = useCallback(
    (event: { type: "Terminal"; payload: TerminalEvent }) => {
      const payload = event.payload;
      if (terminalId && payload.terminal_id !== terminalId) return;

      switch (payload.kind) {
        case "Output":
          setOutput((prev) => prev + payload.data);
          break;
        case "Exit":
          setExited(true);
          setExitCode(payload.code);
          break;
      }
    },
    [terminalId],
  );

  useTauriEvent("terminal:event", handleTerminalEvent);

  const clear = useCallback(() => {
    setOutput("");
    setExited(false);
    setExitCode(null);
  }, []);

  return { output, exited, exitCode, clear };
}
```

**Step 2: Write terminal-panel.tsx**

```tsx
import { useEffect, useRef } from "react";

interface TerminalPanelProps {
  output: string;
  exited: boolean;
  exitCode: number | null;
}

export function TerminalPanel({
  output,
  exited,
  exitCode,
}: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [output]);

  return (
    <div className="font-mono text-[12px] max-h-48 overflow-y-auto">
      <pre className="text-zinc-400 whitespace-pre-wrap">{output}</pre>
      {exited && (
        <div className={`text-[11px] mt-1 ${exitCode === 0 ? "text-emerald-500" : "text-red-400"}`}>
          process exited with code {exitCode}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

**Step 3: Verify build + Commit**

```bash
pnpm build 2>&1 | tail -5
git add -A
git commit -m "Add terminal output panel with useTerminal hook"
```

---

## Task 17: Integration — Wire Everything Together in AppShell

Connect all components, hooks, and commands into the working app.

**Files:**
- Modify: `src/components/layout/app-shell.tsx` — full integration
- Modify: `src/index.css` — verify TUI styles

**Step 1: Update app-shell.tsx with full integration**

Wire up:
- Project creation/opening via input commands (`/new`, `/open`)
- Session creation on project open
- Conversation hook connected to session
- Input routing (`!` → terminal, `/` → commands, else → AI)
- File tree panel toggle with `/files`
- Terminal panel toggle with `/terminal`
- Claude availability check on startup

This is the main wiring file. It connects InputBar → command routing → Tauri commands → hooks → rendering components.

**Step 2: Verify the full app runs**

```bash
cd src-tauri && cargo build
cd .. && pnpm tauri dev
```
Expected: App window opens with status bar, empty conversation area, and input bar. Typing `/new test-project` should create a project.

**Step 3: Commit**

```bash
git add -A
git commit -m "Wire all components together in AppShell for working MVP"
```

---

## Task 18: End-to-End Smoke Test

Manually verify the full flow works.

**Steps:**
1. Launch app with `pnpm tauri dev`
2. Type `/new my-app` — should create project, status bar updates
3. Type `hello, create a file called hello.txt with some content` — should stream AI response, create file
4. Type `/files` — should show file tree with hello.txt
5. Type `!ls` — should show terminal output with hello.txt
6. Type `/terminal` — should show terminal panel

**If Claude CLI is not installed:** The AI commands will show a clear error. File tree and terminal commands should still work (graceful degradation).

**Step 2: Fix any issues found during smoke test**

**Step 3: Final commit**

```bash
git add -A
git commit -m "Fix issues found during end-to-end smoke testing"
```

---

## Summary

| Task | Module | What it builds |
|------|--------|---------------|
| 1 | Scaffold | Clean directory structure, strip old code |
| 2 | Foundation | AppError, Config, module stubs |
| 3 | Events | EventBus, typed AppEvent enum |
| 4 | State | AppState, Tauri wiring |
| 5 | Project | ProjectManager, create/open/list |
| 6 | FileSystem | Sandboxed file CRUD |
| 7 | Session | Message history, SessionManager |
| 8 | AI Engine | Claude CLI streaming, tool routing |
| 9 | Terminal | PTY shell management |
| 10 | Types (TS) | TypeScript mirrors of Rust types |
| 11 | Hooks | useTauriEvent, useTauriCommand |
| 12 | UI Store | Minimal panel state |
| 13 | Layout | AppShell, StatusBar, InputBar |
| 14 | Conversation | Message stream, code blocks |
| 15 | File Viewer | File tree panel |
| 16 | Terminal UI | Terminal output panel |
| 17 | Integration | Wire everything together |
| 18 | Smoke Test | End-to-end verification |

**Total: 18 tasks, ~18 commits, clean architecture from line 1.**
