use std::time::{SystemTime, UNIX_EPOCH};

use tokio::sync::broadcast;
use uuid::Uuid;

use crate::core::events::{AiEvent, AppEvent, FsEvent, TerminalEvent};
use super::protocol::ServerMessage;

/// Translates AppEvents into ServerMessages for relay clients.
/// Spawned as a task when the relay server starts.
pub async fn run_bridge(
    mut event_rx: broadcast::Receiver<AppEvent>,
    client_tx: broadcast::Sender<ServerMessage>,
) {
    loop {
        match event_rx.recv().await {
            Ok(event) => {
                let now = timestamp_ms();

                // Forward every event as a generic Event message
                let category = event_category(&event);
                if let Ok(data) = serde_json::to_value(&event) {
                    let event_msg = ServerMessage::Event {
                        event_id: Uuid::new_v4(),
                        timestamp: now,
                        category: category.to_string(),
                        data,
                    };
                    let _ = client_tx.send(event_msg);
                }

                // Generate notifications for specific events
                if let Some(notification) = generate_notification(&event, now) {
                    let _ = client_tx.send(notification);
                }
            }
            Err(broadcast::error::RecvError::Lagged(n)) => {
                eprintln!("[relay bridge] lagged, skipped {n} events");
            }
            Err(broadcast::error::RecvError::Closed) => {
                eprintln!("[relay bridge] event channel closed, stopping bridge");
                break;
            }
        }
    }
}

fn event_category(event: &AppEvent) -> &'static str {
    match event {
        AppEvent::Ai(_) => "ai",
        AppEvent::Fs(_) => "fs",
        AppEvent::Terminal(_) => "terminal",
        AppEvent::Session(_) => "session",
        AppEvent::Project(_) => "project",
        AppEvent::System(_) => "system",
        AppEvent::Lsp(_) => "lsp",
        AppEvent::Lint(_) => "lint",
        AppEvent::Settings(_) => "settings",
        AppEvent::Collab(_) => "collab",
        AppEvent::Debug(_) => "debug",
        AppEvent::Relay(_) => "relay",
    }
}

/// Public version for use by cloud_client bridge.
pub fn generate_notification_for_cloud(event: &AppEvent, timestamp: i64) -> Option<ServerMessage> {
    generate_notification(event, timestamp)
}

fn generate_notification(event: &AppEvent, timestamp: i64) -> Option<ServerMessage> {
    match event {
        AppEvent::Ai(AiEvent::TurnComplete { session_id: _ }) => Some(ServerMessage::Notification {
            id: Uuid::new_v4(),
            timestamp,
            kind: "turn_complete".to_string(),
            title: "Claude finished responding".to_string(),
            body: "The AI has completed its response.".to_string(),
            priority: "normal".to_string(),
        }),
        AppEvent::Ai(AiEvent::Error { session_id: _, message }) => Some(ServerMessage::Notification {
            id: Uuid::new_v4(),
            timestamp,
            kind: "ai_error".to_string(),
            title: "AI Error".to_string(),
            body: message.clone(),
            priority: "high".to_string(),
        }),
        AppEvent::Terminal(TerminalEvent::Exit { terminal_id: _, code }) if *code != 0 => {
            Some(ServerMessage::Notification {
                id: Uuid::new_v4(),
                timestamp,
                kind: "terminal_error".to_string(),
                title: "Terminal exited with error".to_string(),
                body: format!("Process exited with code {code}"),
                priority: "high".to_string(),
            })
        }
        AppEvent::Fs(FsEvent::FileChangeDetected { path, .. }) => Some(ServerMessage::Notification {
            id: Uuid::new_v4(),
            timestamp,
            kind: "file_changed".to_string(),
            title: "File changed".to_string(),
            body: format!("File changed: {path}"),
            priority: "normal".to_string(),
        }),
        _ => None,
    }
}

fn timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
