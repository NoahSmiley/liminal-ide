pub mod adapter;
pub mod protocol;
pub mod types;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

use adapter::DapAdapter;
use protocol::DapBody;
use types::{Breakpoint, DebugSession, DebugState, StackFrame, Variable};
use crate::core::events::{EventBus, AppEvent, DebugEvent};

pub struct DebugManager {
    session: Arc<Mutex<DebugSession>>,
    adapter: Mutex<Option<DapAdapter>>,
    project_root: Mutex<Option<PathBuf>>,
    event_bus: EventBus,
}

impl DebugManager {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            session: Arc::new(Mutex::new(DebugSession::new())),
            adapter: Mutex::new(None),
            project_root: Mutex::new(None),
            event_bus,
        }
    }

    pub async fn start(&self, adapter_cmd: &str, args: &[&str], cwd: &str, program: &str) -> Result<(), String> {
        let path = PathBuf::from(cwd);
        let mut dap = DapAdapter::spawn(adapter_cmd, args, &path).await?;

        // Send initialize request
        dap.send_request("initialize", Some(serde_json::json!({
            "clientID": "liminal",
            "adapterID": adapter_cmd,
            "supportsVariableType": true,
        }))).await?;

        // Take rx for the event loop before storing the adapter
        let rx = std::mem::replace(&mut dap.rx, tokio::sync::mpsc::channel(1).1);

        *self.project_root.lock().await = Some(path);
        *self.adapter.lock().await = Some(dap);

        // Send launch request
        self.send("launch", Some(serde_json::json!({
            "program": program,
            "cwd": cwd,
            "stopOnEntry": false,
        }))).await?;

        let mut sess = self.session.lock().await;
        sess.state = DebugState::Running;
        drop(sess);

        // Spawn event loop to process DAP messages
        let session = self.session.clone();
        let bus = self.event_bus.clone();
        tokio::spawn(async move {
            let mut rx = rx;
            while let Some(msg) = rx.recv().await {
                match &msg.body {
                    DapBody::Event { event, body } => {
                        match event.as_str() {
                            "stopped" => {
                                let reason = body.as_ref()
                                    .and_then(|b| b.get("reason"))
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown")
                                    .to_string();
                                let thread_id = body.as_ref()
                                    .and_then(|b| b.get("threadId"))
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(1) as u32;
                                let mut sess = session.lock().await;
                                sess.state = DebugState::Paused { reason: reason.clone() };
                                sess.thread_id = Some(thread_id);
                                drop(sess);
                                bus.emit(AppEvent::Debug(DebugEvent::Stopped { reason, thread_id }));
                            }
                            "continued" => {
                                let thread_id = body.as_ref()
                                    .and_then(|b| b.get("threadId"))
                                    .and_then(|v| v.as_u64())
                                    .unwrap_or(1) as u32;
                                session.lock().await.state = DebugState::Running;
                                bus.emit(AppEvent::Debug(DebugEvent::Continued { thread_id }));
                            }
                            "terminated" | "exited" => {
                                let exit_code = body.as_ref()
                                    .and_then(|b| b.get("exitCode"))
                                    .and_then(|v| v.as_i64())
                                    .unwrap_or(0) as i32;
                                session.lock().await.state = DebugState::Exited { code: exit_code };
                                bus.emit(AppEvent::Debug(DebugEvent::Exited { exit_code }));
                            }
                            _ => {}
                        }
                    }
                    DapBody::Response { command, body, success, .. } if *success => {
                        match command.as_str() {
                            "stackTrace" => {
                                if let Some(b) = body {
                                    if let Some(frames_val) = b.get("stackFrames") {
                                        let frames: Vec<StackFrame> = frames_val.as_array()
                                            .map(|arr| arr.iter().filter_map(|f| {
                                                Some(StackFrame {
                                                    id: f.get("id")?.as_u64()? as u32,
                                                    name: f.get("name")?.as_str()?.to_string(),
                                                    source_path: f.get("source")
                                                        .and_then(|s| s.get("path"))
                                                        .and_then(|p| p.as_str())
                                                        .map(|s| s.to_string()),
                                                    line: f.get("line")?.as_u64()? as u32,
                                                    column: f.get("column").and_then(|c| c.as_u64()).unwrap_or(0) as u32,
                                                })
                                            }).collect())
                                            .unwrap_or_default();
                                        session.lock().await.stack_frames = frames.clone();
                                        bus.emit(AppEvent::Debug(DebugEvent::StackFrames { frames }));
                                    }
                                }
                            }
                            "variables" => {
                                if let Some(b) = body {
                                    if let Some(vars_val) = b.get("variables") {
                                        let variables: Vec<Variable> = vars_val.as_array()
                                            .map(|arr| arr.iter().filter_map(|v| {
                                                Some(Variable {
                                                    name: v.get("name")?.as_str()?.to_string(),
                                                    value: v.get("value")?.as_str()?.to_string(),
                                                    kind: v.get("type").and_then(|t| t.as_str()).unwrap_or("").to_string(),
                                                    children_ref: v.get("variablesReference").and_then(|r| r.as_u64()).unwrap_or(0) as u32,
                                                })
                                            }).collect())
                                            .unwrap_or_default();
                                        session.lock().await.variables = variables.clone();
                                        bus.emit(AppEvent::Debug(DebugEvent::Variables { variables }));
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub async fn stop(&self) -> Result<(), String> {
        let mut adapter = self.adapter.lock().await;
        if let Some(ref mut dap) = *adapter {
            let _ = dap.send_request("disconnect", Some(serde_json::json!({"terminateDebuggee": true}))).await;
            let _ = dap.kill().await;
        }
        *adapter = None;
        let mut sess = self.session.lock().await;
        *sess = DebugSession::new();
        Ok(())
    }

    pub async fn set_breakpoint(&self, path: &str, line: u32) -> Result<(), String> {
        let mut sess = self.session.lock().await;
        let id = sess.breakpoints.len() as u32 + 1;
        sess.breakpoints.push(Breakpoint {
            id,
            path: path.to_string(),
            line,
            verified: false,
        });
        drop(sess);
        self.sync_breakpoints(path).await
    }

    pub async fn remove_breakpoint(&self, path: &str, line: u32) -> Result<(), String> {
        let mut sess = self.session.lock().await;
        sess.breakpoints.retain(|bp| !(bp.path == path && bp.line == line));
        drop(sess);
        self.sync_breakpoints(path).await
    }

    async fn sync_breakpoints(&self, path: &str) -> Result<(), String> {
        let sess = self.session.lock().await;
        let bps: Vec<_> = sess.breakpoints.iter()
            .filter(|bp| bp.path == path)
            .map(|bp| serde_json::json!({"line": bp.line}))
            .collect();
        drop(sess);

        self.send("setBreakpoints", Some(serde_json::json!({
            "source": {"path": path},
            "breakpoints": bps,
        }))).await
    }

    pub async fn continue_execution(&self) -> Result<(), String> {
        let sess = self.session.lock().await;
        let tid = sess.thread_id.unwrap_or(1);
        drop(sess);
        self.send("continue", Some(serde_json::json!({"threadId": tid}))).await
    }

    pub async fn step_over(&self) -> Result<(), String> {
        let sess = self.session.lock().await;
        let tid = sess.thread_id.unwrap_or(1);
        drop(sess);
        self.send("next", Some(serde_json::json!({"threadId": tid}))).await
    }

    pub async fn step_into(&self) -> Result<(), String> {
        let sess = self.session.lock().await;
        let tid = sess.thread_id.unwrap_or(1);
        drop(sess);
        self.send("stepIn", Some(serde_json::json!({"threadId": tid}))).await
    }

    pub async fn step_out(&self) -> Result<(), String> {
        let sess = self.session.lock().await;
        let tid = sess.thread_id.unwrap_or(1);
        drop(sess);
        self.send("stepOut", Some(serde_json::json!({"threadId": tid}))).await
    }

    pub async fn get_session(&self) -> DebugSession {
        self.session.lock().await.clone()
    }

    pub async fn update_state(&self, state: DebugState) {
        self.session.lock().await.state = state;
    }

    pub async fn update_stack_frames(&self, frames: Vec<StackFrame>) {
        self.session.lock().await.stack_frames = frames;
    }

    pub async fn update_variables(&self, vars: Vec<Variable>) {
        self.session.lock().await.variables = vars;
    }

    pub async fn set_thread_id(&self, id: u32) {
        self.session.lock().await.thread_id = Some(id);
    }

    async fn send(&self, command: &str, args: Option<serde_json::Value>) -> Result<(), String> {
        let adapter = self.adapter.lock().await;
        match &*adapter {
            Some(dap) => dap.send_request(command, args).await,
            None => Err("No debug adapter running".to_string()),
        }
    }
}
