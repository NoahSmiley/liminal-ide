use std::collections::HashMap;
use std::sync::Arc;

use tokio::net::TcpListener;
use tokio::sync::{broadcast, RwLock};
use tokio_tungstenite::accept_async;

use crate::core::events::{AppEvent, RelayUiEvent};
use crate::state::AppState;

use super::auth::AuthManager;
use super::bridge;
use super::connection::{self, ClientMap};
use super::protocol::ServerMessage;
use super::types::{ClientInfo, RelayConfig};

pub struct RelayServer {
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    clients: ClientMap,
    port: u16,
}

impl RelayServer {
    pub async fn start(
        config: &RelayConfig,
        auth: Arc<AuthManager>,
        app_state: Arc<AppState>,
    ) -> Result<Self, String> {
        let addr = format!("{}:{}", config.bind_address, config.port);
        let listener = TcpListener::bind(&addr).await
            .map_err(|e| format!("Failed to bind to {addr}: {e}"))?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();

        let clients: ClientMap = Arc::new(RwLock::new(HashMap::new()));
        let max_clients = config.max_clients;

        // Broadcast channel for events → all clients
        let (event_tx, _) = broadcast::channel::<AppEvent>(256);
        app_state.event_bus.set_relay_sender(event_tx.clone());

        // Broadcast channel for translated ServerMessages → clients
        let (server_msg_tx, _) = broadcast::channel::<ServerMessage>(256);

        // Spawn bridge task
        let bridge_rx = event_tx.subscribe();
        let bridge_msg_tx = server_msg_tx.clone();
        tokio::spawn(async move {
            bridge::run_bridge(bridge_rx, bridge_msg_tx).await;
        });

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

        let clients_for_accept = clients.clone();
        let event_bus = app_state.event_bus.clone();

        // Emit started event
        let pairing_code = auth.get_code().await;
        event_bus.emit(AppEvent::Relay(RelayUiEvent::ServerStarted {
            port,
            pairing_code,
        }));

        // Accept loop
        tokio::spawn(async move {
            eprintln!("[relay] server listening on {addr}");
            loop {
                tokio::select! {
                    accept = listener.accept() => {
                        match accept {
                            Ok((stream, addr)) => {
                                // Check max clients
                                let client_count = clients_for_accept.read().await.len();
                                if client_count >= max_clients {
                                    eprintln!("[relay] rejecting {addr}: max clients ({max_clients}) reached");
                                    continue;
                                }

                                let ws_stream = match accept_async(stream).await {
                                    Ok(ws) => ws,
                                    Err(e) => {
                                        eprintln!("[relay] ws handshake failed for {addr}: {e}");
                                        continue;
                                    }
                                };

                                let clients = clients_for_accept.clone();
                                let auth = auth.clone();
                                let broadcast_rx = server_msg_tx.subscribe();
                                let state = app_state.clone();

                                tokio::spawn(async move {
                                    connection::handle_connection(
                                        ws_stream, addr, clients, auth,
                                        broadcast_rx, state,
                                    ).await;
                                });
                            }
                            Err(e) => {
                                eprintln!("[relay] accept error: {e}");
                            }
                        }
                    }
                    _ = &mut shutdown_rx => {
                        eprintln!("[relay] server shutting down");
                        break;
                    }
                }
            }

            // Disconnect all clients on shutdown
            let mut map = clients_for_accept.write().await;
            map.clear();
            event_bus.emit(AppEvent::Relay(RelayUiEvent::ServerStopped));
        });

        Ok(Self {
            shutdown_tx: Some(shutdown_tx),
            clients,
            port,
        })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn connected_clients(&self) -> Vec<ClientInfo> {
        self.clients.read().await.values().map(|h| h.info.clone()).collect()
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for RelayServer {
    fn drop(&mut self) {
        self.stop();
    }
}
