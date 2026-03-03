use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use tokio::io::BufReader;
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{oneshot, Mutex};

use crate::core::events::{AppEvent, EventBus, LspEvent};
use crate::error::LspError;

use super::protocol::{read_message, send_message, JsonRpcResponse};

type PendingMap = Arc<Mutex<HashMap<u64, oneshot::Sender<JsonRpcResponse>>>>;

pub struct LspServer {
    stdin: Arc<Mutex<ChildStdin>>,
    next_id: AtomicU64,
    pending: PendingMap,
    _child: Child,
}

impl LspServer {
    pub async fn spawn(
        name: &str,
        cmd: &str,
        args: &[&str],
        project_root: &Path,
        event_bus: EventBus,
    ) -> Result<Self, LspError> {
        let mut child = Command::new(cmd)
            .args(args)
            .current_dir(project_root)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| LspError::SpawnFailed(format!("{}: {}", name, e)))?;

        let stdin = child
            .stdin
            .take()
            .ok_or(LspError::SpawnFailed("No stdin".into()))?;
        let stdout = child
            .stdout
            .take()
            .ok_or(LspError::SpawnFailed("No stdout".into()))?;

        let stdin = Arc::new(Mutex::new(stdin));
        let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));
        let server_name = name.to_string();

        // Background reader task
        let pending_clone = pending.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            loop {
                match read_message(&mut reader).await {
                    Ok(msg) => route_message(msg, &pending_clone, &event_bus, &server_name).await,
                    Err(LspError::ServerExited) => {
                        event_bus.emit(AppEvent::Lsp(LspEvent::ServerError {
                            name: server_name.clone(),
                            message: "Server exited".into(),
                        }));
                        break;
                    }
                    Err(e) => {
                        log::warn!("LSP read error ({}): {}", server_name, e);
                        break;
                    }
                }
            }
        });

        Ok(Self {
            stdin,
            next_id: AtomicU64::new(1),
            pending,
            _child: child,
        })
    }

    /// Send a request and wait for the response.
    pub async fn request(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, LspError> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let msg = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });

        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(id, tx);

        send_message(&mut *self.stdin.lock().await, &msg).await?;

        let resp = rx
            .await
            .map_err(|_| LspError::RequestFailed("Response channel closed".into()))?;

        if let Some(err) = resp.error {
            return Err(LspError::RequestFailed(err.to_string()));
        }
        Ok(resp.result.unwrap_or(serde_json::Value::Null))
    }

    /// Send a notification (no response expected).
    pub async fn notify(
        &self,
        method: &str,
        params: serde_json::Value,
    ) -> Result<(), LspError> {
        let msg = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        });
        send_message(&mut *self.stdin.lock().await, &msg).await
    }

    /// Send shutdown request then exit notification.
    pub async fn shutdown(&self) -> Result<(), LspError> {
        let _ = self.request("shutdown", serde_json::Value::Null).await;
        self.notify("exit", serde_json::Value::Null).await
    }
}

async fn route_message(
    msg: JsonRpcResponse,
    pending: &PendingMap,
    event_bus: &EventBus,
    server_name: &str,
) {
    // If it has an id, it's a response to a pending request
    if let Some(id) = msg.id {
        if let Some(tx) = pending.lock().await.remove(&id) {
            let _ = tx.send(msg);
            return;
        }
    }

    // Otherwise it's a notification from the server
    if let Some(method) = &msg.method {
        if method == "textDocument/publishDiagnostics" {
            if let Some(params) = msg.params {
                event_bus.emit(AppEvent::Lsp(LspEvent::Diagnostics {
                    name: server_name.to_string(),
                    data: params,
                }));
            }
        }
    }
}
