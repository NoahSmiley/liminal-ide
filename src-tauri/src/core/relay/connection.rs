use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio_tungstenite::tungstenite::Message as WsMessage;
use uuid::Uuid;

use crate::core::events::{AppEvent, RelayUiEvent};
use crate::state::AppState;

use super::auth::AuthManager;
use super::protocol::{ClientMessage, RelayCommand, ServerMessage};
use super::types::{ClientId, ClientInfo};

pub struct ClientHandle {
    pub info: ClientInfo,
    pub tx: mpsc::UnboundedSender<ServerMessage>,
}

pub type ClientMap = Arc<RwLock<HashMap<ClientId, ClientHandle>>>;

pub async fn handle_connection(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    addr: std::net::SocketAddr,
    clients: ClientMap,
    auth: Arc<AuthManager>,
    broadcast_rx: broadcast::Receiver<ServerMessage>,
    app_state: Arc<AppState>,
) {
    let (mut ws_write, mut ws_read) = ws_stream.split();

    // Phase 1: Authentication (30s timeout)
    let auth_result = tokio::time::timeout(Duration::from_secs(30), async {
        let mut failed_attempts = 0u32;
        loop {
            let msg = ws_read.next().await;
            match msg {
                Some(Ok(WsMessage::Text(text))) => {
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(ClientMessage::Authenticate { method, device_name, device_id }) => {
                            let authenticated = match &method {
                                super::protocol::AuthMethod::PairingCode { code } => {
                                    let expected = auth.get_code().await;
                                    eprintln!("[relay] pairing attempt: received='{}' expected='{}'", code, expected);
                                    auth.validate_code(code).await
                                }
                                super::protocol::AuthMethod::Token { token } => {
                                    auth.validate_token(&device_id, token).await
                                }
                            };

                            if authenticated {
                                let token = match &method {
                                    super::protocol::AuthMethod::PairingCode { .. } => {
                                        Some(auth.pair_device(&device_id, &device_name).await)
                                    }
                                    super::protocol::AuthMethod::Token { .. } => None,
                                };

                                let result = ServerMessage::AuthResult {
                                    success: true,
                                    token,
                                    error: None,
                                };
                                let json = serde_json::to_string(&result).unwrap();
                                if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                                    return None;
                                }

                                return Some((device_name, device_id));
                            } else {
                                failed_attempts += 1;
                                let result = ServerMessage::AuthResult {
                                    success: false,
                                    token: None,
                                    error: Some("Invalid credentials".to_string()),
                                };
                                let json = serde_json::to_string(&result).unwrap();
                                let _ = ws_write.send(WsMessage::Text(json.into())).await;

                                if failed_attempts >= 5 {
                                    return None;
                                }
                            }
                        }
                        Ok(ClientMessage::Ping) => {
                            let json = serde_json::to_string(&ServerMessage::Pong).unwrap();
                            let _ = ws_write.send(WsMessage::Text(json.into())).await;
                        }
                        _ => {}
                    }
                }
                Some(Ok(WsMessage::Close(_))) | None => return None,
                _ => {}
            }
        }
    })
    .await;

    let (device_name, device_id) = match auth_result {
        Ok(Some(info)) => info,
        _ => {
            eprintln!("[relay] auth failed or timed out for {addr}");
            return;
        }
    };

    let client_id = Uuid::new_v4();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let info = ClientInfo {
        id: client_id,
        device_name: device_name.clone(),
        device_id: device_id.clone(),
        connected_at: now,
    };

    // Create direct channel for command results
    let (direct_tx, mut direct_rx) = mpsc::unbounded_channel::<ServerMessage>();

    // Register client
    {
        let mut map = clients.write().await;
        map.insert(client_id, ClientHandle { info: info.clone(), tx: direct_tx.clone() });
    }

    // Emit connected event
    app_state.event_bus.emit(AppEvent::Relay(RelayUiEvent::ClientConnected {
        device_name: device_name.clone(),
    }));

    eprintln!("[relay] client authenticated: {} ({}) id={}", device_name, addr, client_id);

    // Phase 2: Send initial state
    let initial = build_initial_state(&app_state).await;
    let json = serde_json::to_string(&initial).unwrap();
    if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
        cleanup_client(&clients, client_id, &device_name, &app_state).await;
        return;
    }

    // Phase 3: Read/write loops
    let mut broadcast_rx = broadcast_rx;
    let state_for_commands = app_state.clone();

    loop {
        tokio::select! {
            // Broadcast events to client
            event = broadcast_rx.recv() => {
                match event {
                    Ok(msg) => {
                        let json = serde_json::to_string(&msg).unwrap();
                        if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        eprintln!("[relay] client {client_id} lagged {n} messages");
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            // Direct messages (command results)
            direct = direct_rx.recv() => {
                match direct {
                    Some(msg) => {
                        let json = serde_json::to_string(&msg).unwrap();
                        if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    None => break,
                }
            }
            // Read from client
            ws_msg = ws_read.next() => {
                match ws_msg {
                    Some(Ok(WsMessage::Text(text))) => {
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(ClientMessage::Command { id, command }) => {
                                let result = dispatch_command(
                                    &state_for_commands,
                                    command,
                                ).await;
                                let response = match result {
                                    Ok(data) => ServerMessage::CommandResult {
                                        command_id: id,
                                        success: true,
                                        data: Some(data),
                                        error: None,
                                    },
                                    Err(e) => ServerMessage::CommandResult {
                                        command_id: id,
                                        success: false,
                                        data: None,
                                        error: Some(e),
                                    },
                                };
                                let json = serde_json::to_string(&response).unwrap();
                                if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                            Ok(ClientMessage::Ping) => {
                                let json = serde_json::to_string(&ServerMessage::Pong).unwrap();
                                if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                                    break;
                                }
                            }
                            Ok(ClientMessage::Authenticate { .. }) => {
                                // Already authenticated, ignore
                            }
                            Err(e) => {
                                eprintln!("[relay] bad message from {client_id}: {e}");
                            }
                        }
                    }
                    Some(Ok(WsMessage::Close(_))) | None => break,
                    Some(Err(e)) => {
                        eprintln!("[relay] ws error from {client_id}: {e}");
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    cleanup_client(&clients, client_id, &device_name, &app_state).await;
}

async fn cleanup_client(
    clients: &ClientMap,
    client_id: ClientId,
    device_name: &str,
    app_state: &AppState,
) {
    clients.write().await.remove(&client_id);
    app_state.event_bus.emit(AppEvent::Relay(RelayUiEvent::ClientDisconnected {
        device_name: device_name.to_string(),
    }));
    eprintln!("[relay] client disconnected: {device_name} id={client_id}");
}

pub async fn build_initial_state(state: &AppState) -> ServerMessage {
    let active_project = state.project_manager.get_active().await;
    let active_session = None; // No single "active" session tracked at this level

    let project_id = active_project.as_ref().map(|p| p.id);
    let list = state.session_manager.list_sessions(project_id).await;
    let sessions = serde_json::to_value(list).unwrap_or_default();

    let terminal_ids = state.terminal_manager.list().await;
    let terminals = serde_json::to_value(terminal_ids).unwrap_or_default();

    let project = active_project.as_ref().map(|p| {
        serde_json::json!({
            "id": p.id,
            "name": p.name,
            "root_path": p.root_path,
        })
    });

    ServerMessage::InitialState {
        sessions,
        active_session,
        terminals,
        project,
    }
}

pub async fn dispatch_command(
    state: &AppState,
    command: RelayCommand,
) -> Result<serde_json::Value, String> {
    match command {
        RelayCommand::SendMessage { session_id, content } => {
            // Append user message
            state
                .session_manager
                .append_message(
                    session_id,
                    crate::core::session::Message {
                        role: crate::core::session::Role::User,
                        content: content.clone(),
                    },
                )
                .await
                .map_err(|e| e.to_string())?;

            // Broadcast user message to all clients (desktop + other relay devices)
            state.event_bus.emit(AppEvent::Session(
                crate::core::events::SessionEvent::MessageAdded {
                    session_id,
                    role: "user".to_string(),
                    content: content.clone(),
                },
            ));

            // Spawn AI task (mirrors commands/ai.rs send_message logic)
            let event_bus = state.event_bus.clone();
            let session_manager = state.session_manager.clone();
            let model = state.ai_engine.model().to_string();
            let project_root = state.project_manager.get_active().await.map(|p| p.root_path);
            let timeout_secs = state.config.claude_timeout_seconds;
            let session = state.session_manager.get_session(session_id).await
                .map_err(|e| e.to_string())?;
            let cli_sid = session.cli_session_id.clone();
            let change_tracker = state.change_tracker_arc();
            let pinned_context = match project_root.as_deref() {
                Some(root) => state.context_pin_manager.build_context_block(root).await,
                None => String::new(),
            };
            let editor_context = state.editor_context_manager.format_for_prompt().await;

            let handle = tokio::spawn(async move {
                change_tracker.begin_turn(session_id).await;
                let mut system_prompt = crate::core::ai_engine::AiEngine::system_prompt(
                    project_root.as_deref(),
                    &pinned_context,
                    "",
                );
                if !editor_context.is_empty() {
                    system_prompt.push_str(&editor_context);
                }
                let future = crate::core::ai_engine::streaming::stream_claude_response(
                    &event_bus, session_id, &content, &system_prompt,
                    &model, cli_sid.as_deref(), project_root.as_deref(), &change_tracker,
                    &crate::core::settings::schema::PermissionMode::Full,
                );
                let result = tokio::time::timeout(
                    std::time::Duration::from_secs(timeout_secs),
                    future,
                ).await;

                match result {
                    Ok(Ok(sr)) => {
                        if let Some(sid) = sr.cli_session_id {
                            let _ = session_manager.set_cli_session_id(session_id, sid).await;
                        }
                        let _ = session_manager.append_message(
                            session_id,
                            crate::core::session::Message {
                                role: crate::core::session::Role::Assistant,
                                content: sr.text,
                            },
                        ).await;
                        change_tracker.complete_turn().await;
                    }
                    Ok(Err(e)) => {
                        event_bus.emit(AppEvent::Ai(crate::core::events::AiEvent::Error {
                            session_id,
                            message: e.to_string(),
                        }));
                        event_bus.emit(AppEvent::Ai(crate::core::events::AiEvent::TurnComplete {
                            session_id,
                        }));
                        change_tracker.complete_turn().await;
                    }
                    Err(_) => {
                        event_bus.emit(AppEvent::Ai(crate::core::events::AiEvent::Error {
                            session_id,
                            message: format!("Request timed out after {timeout_secs}s"),
                        }));
                        event_bus.emit(AppEvent::Ai(crate::core::events::AiEvent::TurnComplete {
                            session_id,
                        }));
                        change_tracker.complete_turn().await;
                    }
                }
            });

            let mut task = state.active_ai_task.lock().await;
            *task = Some(handle);

            Ok(serde_json::json!({ "queued": true }))
        }

        RelayCommand::CancelAiTask => {
            let mut task = state.active_ai_task.lock().await;
            if let Some(handle) = task.take() {
                handle.abort();
            }
            Ok(serde_json::json!({ "cancelled": true }))
        }

        RelayCommand::TerminalInput { terminal_id, input } => {
            state.terminal_manager.send_input(terminal_id, &input).await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "sent": true }))
        }

        RelayCommand::SpawnTerminal => {
            let project = state.project_manager.get_active().await
                .ok_or_else(|| "No active project".to_string())?;
            let id = state.terminal_manager
                .spawn_shell(project.root_path, state.event_bus.clone())
                .await
                .map_err(|e| e.to_string())?;
            Ok(serde_json::json!({ "terminal_id": id }))
        }

        RelayCommand::ApproveChange { turn_id: _, path } => {
            state.diff_stager.accept_file(&path).await;
            Ok(serde_json::json!({ "approved": true }))
        }

        RelayCommand::RejectChange { turn_id: _, path } => {
            if let Some(diff) = state.diff_stager.reject_file(&path).await {
                if let Some(before) = &diff.before {
                    let root = state.project_manager.get_active().await.map(|p| p.root_path);
                    if let Some(root) = root {
                        let _ = state.fs_manager.write_file(
                            &root,
                            std::path::Path::new(&path),
                            before,
                        );
                    }
                }
            }
            Ok(serde_json::json!({ "rejected": true }))
        }

        RelayCommand::GetSessionState { session_id } => {
            let session = state.session_manager.get_session(session_id).await
                .map_err(|e| e.to_string())?;
            serde_json::to_value(session).map_err(|e| e.to_string())
        }

        RelayCommand::ListSessions => {
            let project_id = state.project_manager.get_active().await.map(|p| p.id);
            let sessions = state.session_manager.list_sessions(project_id).await;
            serde_json::to_value(sessions).map_err(|e| e.to_string())
        }

        RelayCommand::CreateSession { name: _ } => {
            let project_id = state.project_manager.get_active().await.map(|p| p.id);
            let session = state.session_manager
                .create_session(project_id)
                .await;
            Ok(serde_json::json!({ "session_id": session.id }))
        }

        RelayCommand::GetInitialState => {
            let active_project = state.project_manager.get_active().await;
            let project_id = active_project.as_ref().map(|p| p.id);
            let list = state.session_manager.list_sessions(project_id).await;
            let sessions = serde_json::to_value(list).unwrap_or_default();
            let terminal_ids = state.terminal_manager.list().await;
            let terminals = serde_json::to_value(terminal_ids).unwrap_or_default();

            let project = active_project.as_ref().map(|p| {
                serde_json::json!({
                    "id": p.id,
                    "name": p.name,
                    "root_path": p.root_path,
                })
            });

            Ok(serde_json::json!({
                "sessions": sessions,
                "active_session": null,
                "terminals": terminals,
                "project": project
            }))
        }
    }
}
