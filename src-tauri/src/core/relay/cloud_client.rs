use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, mpsc, watch};
use tokio_tungstenite::tungstenite::Message as WsMessage;
use uuid::Uuid;

use crate::core::events::{AppEvent, RelayUiEvent};
use crate::state::AppState;

use super::bridge;
use super::connection::{build_initial_state, dispatch_command};
use super::protocol::{ClientMessage, ServerMessage};


/// Outbound WebSocket client that connects to a cloud relay proxy.
/// Runs alongside the local relay server — both can be active simultaneously.
pub struct CloudClient {
    shutdown_tx: Option<watch::Sender<bool>>,
}

impl CloudClient {
    /// Connect to the cloud proxy and start forwarding messages.
    pub async fn start(
        cloud_url: String,
        account_key: Uuid,
        app_state: Arc<AppState>,
    ) -> Result<Self, String> {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);

        let event_bus = app_state.event_bus.clone();

        tokio::spawn(cloud_connection_loop(
            cloud_url,
            account_key,
            app_state,
            shutdown_rx,
        ));

        event_bus.emit(AppEvent::Relay(RelayUiEvent::CloudConnected {
            cloud_url: String::new(),
        }));

        Ok(Self {
            shutdown_tx: Some(shutdown_tx),
        })
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(true);
        }
    }
}

impl Drop for CloudClient {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Main reconnection loop. Runs until shutdown signal.
async fn cloud_connection_loop(
    cloud_url: String,
    account_key: Uuid,
    app_state: Arc<AppState>,
    mut shutdown_rx: watch::Receiver<bool>,
) {
    let mut backoff_secs: u64 = 1;
    let max_backoff: u64 = 30;

    loop {
        if *shutdown_rx.borrow() {
            break;
        }

        eprintln!("[cloud] connecting to {cloud_url}...");

        let ws_url = format!(
            "{}/?role=desktop&key={}",
            cloud_url.trim_end_matches('/'), account_key
        );

        match tokio_tungstenite::connect_async(&ws_url).await {
            Ok((ws_stream, _)) => {
                eprintln!("[cloud] connected to {cloud_url}");
                backoff_secs = 1; // Reset backoff on successful connection

                app_state.event_bus.emit(AppEvent::Relay(RelayUiEvent::CloudConnected {
                    cloud_url: cloud_url.clone(),
                }));

                // Run the session until it disconnects or shutdown
                let disconnected = run_cloud_session(
                    ws_stream,
                    app_state.clone(),
                    &mut shutdown_rx,
                ).await;

                app_state.event_bus.emit(AppEvent::Relay(RelayUiEvent::CloudDisconnected));

                if !disconnected {
                    // Shutdown was requested
                    break;
                }

                eprintln!("[cloud] disconnected, will reconnect in {backoff_secs}s");
            }
            Err(e) => {
                eprintln!("[cloud] connection failed: {e}, retrying in {backoff_secs}s");
            }
        }

        // Wait with backoff, but listen for shutdown
        let delay = tokio::time::sleep(Duration::from_secs(backoff_secs));
        tokio::select! {
            _ = delay => {}
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    break;
                }
            }
        }

        backoff_secs = (backoff_secs * 2).min(max_backoff);
    }

    eprintln!("[cloud] connection loop stopped");
}

/// Handle a single connected session. Returns true if the connection dropped
/// (should reconnect), false if shutdown was requested.
async fn run_cloud_session(
    ws_stream: tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    app_state: Arc<AppState>,
    shutdown_rx: &mut watch::Receiver<bool>,
) -> bool {
    let (mut ws_write, mut ws_read) = ws_stream.split();

    // Set up event forwarding: EventBus → bridge → ServerMessage → proxy
    let (event_tx, _) = broadcast::channel::<AppEvent>(256);
    let (server_msg_tx, mut server_msg_rx) = mpsc::unbounded_channel::<ServerMessage>();

    // Bridge task: converts AppEvents to ServerMessages
    let bridge_rx = event_tx.subscribe();
    let bridge_fwd_tx = server_msg_tx;
    let bridge_handle = tokio::spawn(async move {
        let mut bridge_rx = bridge_rx;
        loop {
            match bridge_rx.recv().await {
                Ok(event) => {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as i64;

                    let category = match &event {
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
                    };

                    if let Ok(data) = serde_json::to_value(&event) {
                        let event_msg = ServerMessage::Event {
                            event_id: Uuid::new_v4(),
                            timestamp: now,
                            category: category.to_string(),
                            data,
                        };
                        let _ = bridge_fwd_tx.send(event_msg);
                    }

                    // Generate notifications for specific events
                    if let Some(notification) = bridge::generate_notification_for_cloud(&event, now) {
                        let _ = bridge_fwd_tx.send(notification);
                    }
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    eprintln!("[cloud bridge] lagged, skipped {n} events");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    // Subscribe to EventBus for cloud forwarding
    // We use the existing relay_tx mechanism — but we need a separate sender
    // since the local relay may also be using it. Instead, we subscribe
    // to events via a dedicated cloud sender on EventBus.
    app_state.event_bus.set_cloud_sender(event_tx.clone());

    // Send initial state to the phone so it knows about sessions/terminals
    let initial = build_initial_state(&app_state).await;
    let initial_json = serde_json::to_string(&initial).unwrap();
    if ws_write.send(WsMessage::Text(initial_json.into())).await.is_err() {
        app_state.event_bus.clear_cloud_sender();
        bridge_handle.abort();
        return true;
    }

    // Ping timer
    let (ping_tx, mut ping_rx) = mpsc::channel::<()>(1);
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            if ping_tx.send(()).await.is_err() {
                break;
            }
        }
    });

    let result = loop {
        tokio::select! {
            // Shutdown signal
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    break false;
                }
            }

            // Outbound: ServerMessages → proxy
            msg = server_msg_rx.recv() => {
                match msg {
                    Some(server_msg) => {
                        let json = serde_json::to_string(&server_msg).unwrap();
                        if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                            break true;
                        }
                    }
                    None => break true,
                }
            }

            // Ping keepalive
            _ = ping_rx.recv() => {
                let pong = serde_json::to_string(&ServerMessage::Pong).unwrap();
                if ws_write.send(WsMessage::Text(pong.into())).await.is_err() {
                    break true;
                }
            }

            // Inbound: proxy → desktop (phone commands forwarded by proxy)
            ws_msg = ws_read.next() => {
                match ws_msg {
                    Some(Ok(WsMessage::Text(text))) => {
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(ClientMessage::Command { id, command }) => {
                                let result = dispatch_command(&app_state, command).await;
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
                                    break true;
                                }
                            }
                            Ok(ClientMessage::Ping) => {
                                let json = serde_json::to_string(&ServerMessage::Pong).unwrap();
                                if ws_write.send(WsMessage::Text(json.into())).await.is_err() {
                                    break true;
                                }
                            }
                            Ok(ClientMessage::Authenticate { .. }) => {
                                // Cloud doesn't use auth messages — ignore
                            }
                            Err(e) => {
                                eprintln!("[cloud] bad message from proxy: {e}");
                            }
                        }
                    }
                    Some(Ok(WsMessage::Close(_))) | None => break true,
                    Some(Err(e)) => {
                        eprintln!("[cloud] ws error: {e}");
                        break true;
                    }
                    _ => {}
                }
            }
        }
    };

    // Cleanup
    app_state.event_bus.clear_cloud_sender();
    bridge_handle.abort();

    result
}
