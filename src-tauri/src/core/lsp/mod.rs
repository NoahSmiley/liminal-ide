pub mod detection;
pub mod protocol;
pub mod server;

use std::collections::HashMap;
use std::path::PathBuf;

use tokio::sync::Mutex;

use crate::core::events::{AppEvent, EventBus, LspEvent};
use crate::error::LspError;

use self::detection::detect_servers;
use self::server::LspServer;

pub struct LspManager {
    servers: Mutex<HashMap<String, LspServer>>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
        }
    }

    /// Detect and start all available LSP servers for a project.
    pub async fn start_for_project(
        &self,
        project_root: PathBuf,
        event_bus: EventBus,
    ) -> Result<Vec<String>, LspError> {
        let detected = detect_servers(&project_root);
        let mut started = Vec::new();

        for det in detected {
            let args: Vec<&str> = det.args.iter().map(|s| s.as_str()).collect();
            match LspServer::spawn(&det.name, &det.cmd, &args, &project_root, event_bus.clone())
                .await
            {
                Ok(server) => {
                    Self::initialize(&server, &project_root).await?;
                    event_bus.emit(AppEvent::Lsp(LspEvent::ServerStarted {
                        name: det.name.clone(),
                    }));
                    started.push(det.name.clone());
                    self.servers.lock().await.insert(det.name, server);
                }
                Err(e) => {
                    log::warn!("Failed to start LSP {}: {}", det.name, e);
                    event_bus.emit(AppEvent::Lsp(LspEvent::ServerError {
                        name: det.name,
                        message: e.to_string(),
                    }));
                }
            }
        }

        Ok(started)
    }

    /// Shut down all running servers.
    pub async fn stop_all(&self) {
        let mut servers = self.servers.lock().await;
        for (name, server) in servers.drain() {
            if let Err(e) = server.shutdown().await {
                log::warn!("LSP {} shutdown error: {}", name, e);
            }
        }
    }

    /// Send a request to a named server.
    pub async fn request(
        &self,
        server_name: &str,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, LspError> {
        let servers = self.servers.lock().await;
        let server = servers
            .get(server_name)
            .ok_or_else(|| LspError::ServerNotFound(server_name.into()))?;
        server.request(method, params).await
    }

    /// Send a notification to a named server.
    pub async fn notify(
        &self,
        server_name: &str,
        method: &str,
        params: serde_json::Value,
    ) -> Result<(), LspError> {
        let servers = self.servers.lock().await;
        let server = servers
            .get(server_name)
            .ok_or_else(|| LspError::ServerNotFound(server_name.into()))?;
        server.notify(method, params).await
    }

    async fn initialize(server: &LspServer, root: &PathBuf) -> Result<(), LspError> {
        let root_uri = format!("file://{}", root.display());
        let params = serde_json::json!({
            "processId": std::process::id(),
            "rootUri": root_uri,
            "capabilities": {
                "textDocument": {
                    "completion": { "completionItem": { "snippetSupport": false } },
                    "hover": { "contentFormat": ["plaintext"] },
                    "publishDiagnostics": { "relatedInformation": true },
                    "definition": {},
                    "synchronization": { "didSave": true }
                }
            }
        });

        server.request("initialize", params).await?;
        server.notify("initialized", serde_json::json!({})).await
    }
}
