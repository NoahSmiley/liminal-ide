use serde::Serialize;
use tauri::{AppHandle, Emitter};
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
    Lsp(LspEvent),
    Lint(LintEvent),
    Settings(SettingsEvent),
    Collab(CollabEvent),
    Debug(DebugEvent),
    Relay(RelayUiEvent),
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum RelayUiEvent {
    ServerStarted { port: u16, pairing_code: String },
    ServerStopped,
    ClientConnected { device_name: String },
    ClientDisconnected { device_name: String },
    CloudConnected { cloud_url: String },
    CloudDisconnected,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum AiEvent {
    Thinking { session_id: Uuid },
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
    FileRenamed { old_path: String, new_path: String },
    FileDeleted { path: String },
    FileChangeDetected { path: String, before: Option<String>, after: String, turn_id: Uuid },
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
    MessageAdded { session_id: Uuid, role: String, content: String },
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

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum LspEvent {
    ServerStarted { name: String },
    ServerError { name: String, message: String },
    Diagnostics { name: String, data: serde_json::Value },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum LintEvent {
    Started { command: String },
    Complete { success: bool, output: String, command: String },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum SettingsEvent {
    Updated { settings: crate::core::settings::schema::Settings },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum CollabEvent {
    UserJoined { room_id: String, user_name: String },
    UserLeft { room_id: String, user_name: String },
    CursorUpdate { user_name: String, file: String, line: u32, col: u32 },
    ChatMessage { user_name: String, content: String },
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind")]
pub enum DebugEvent {
    Stopped { reason: String, thread_id: u32 },
    Continued { thread_id: u32 },
    Exited { exit_code: i32 },
    StackFrames { frames: Vec<crate::core::debugger::types::StackFrame> },
    Variables { variables: Vec<crate::core::debugger::types::Variable> },
}

#[derive(Clone)]
pub struct EventBus {
    app_handle: AppHandle,
    relay_tx: std::sync::Arc<std::sync::Mutex<Option<tokio::sync::broadcast::Sender<AppEvent>>>>,
    cloud_tx: std::sync::Arc<std::sync::Mutex<Option<tokio::sync::broadcast::Sender<AppEvent>>>>,
}

impl EventBus {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            relay_tx: std::sync::Arc::new(std::sync::Mutex::new(None)),
            cloud_tx: std::sync::Arc::new(std::sync::Mutex::new(None)),
        }
    }

    pub fn set_relay_sender(&self, tx: tokio::sync::broadcast::Sender<AppEvent>) {
        if let Ok(mut relay) = self.relay_tx.lock() {
            *relay = Some(tx);
        }
    }

    pub fn clear_relay_sender(&self) {
        if let Ok(mut relay) = self.relay_tx.lock() {
            *relay = None;
        }
    }

    pub fn set_cloud_sender(&self, tx: tokio::sync::broadcast::Sender<AppEvent>) {
        if let Ok(mut cloud) = self.cloud_tx.lock() {
            *cloud = Some(tx);
        }
    }

    pub fn clear_cloud_sender(&self) {
        if let Ok(mut cloud) = self.cloud_tx.lock() {
            *cloud = None;
        }
    }

    pub fn emit(&self, event: AppEvent) {
        let event_name = match &event {
            AppEvent::Ai(_) => "ai:event",
            AppEvent::Fs(_) => "fs:event",
            AppEvent::Terminal(_) => "terminal:event",
            AppEvent::Session(_) => "session:event",
            AppEvent::Project(_) => "project:event",
            AppEvent::System(_) => "system:event",
            AppEvent::Lsp(_) => "lsp:event",
            AppEvent::Lint(_) => "lint:event",
            AppEvent::Settings(_) => "settings:event",
            AppEvent::Collab(_) => "collab:event",
            AppEvent::Debug(_) => "debug:event",
            AppEvent::Relay(_) => "relay:event",
        };

        if let Err(e) = self.app_handle.emit(event_name, &event) {
            eprintln!("Failed to emit event {}: {}", event_name, e);
        }

        // Forward to local relay if connected
        if let Ok(relay) = self.relay_tx.lock() {
            if let Some(tx) = relay.as_ref() {
                let _ = tx.send(event.clone());
            }
        }

        // Forward to cloud relay if connected
        if let Ok(cloud) = self.cloud_tx.lock() {
            if let Some(tx) = cloud.as_ref() {
                let _ = tx.send(event);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ai_event_serializes_with_tag() {
        let event = AppEvent::Ai(AiEvent::TextDelta {
            session_id: Uuid::nil(),
            content: "hello".to_string(),
        });
        let json = serde_json::to_string(&event).expect("serialize failed");
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
        let json = serde_json::to_string(&event).expect("serialize failed");
        assert!(json.contains("\"type\":\"Fs\""));
        assert!(json.contains("\"kind\":\"FileCreated\""));
    }
}
