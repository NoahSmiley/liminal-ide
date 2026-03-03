pub mod adapter;
pub mod protocol;
pub mod types;

use std::path::PathBuf;
use tokio::sync::Mutex;

use adapter::DapAdapter;
use types::{Breakpoint, DebugSession, DebugState, StackFrame, Variable};

pub struct DebugManager {
    session: Mutex<DebugSession>,
    adapter: Mutex<Option<DapAdapter>>,
    project_root: Mutex<Option<PathBuf>>,
}

impl DebugManager {
    pub fn new() -> Self {
        Self {
            session: Mutex::new(DebugSession::new()),
            adapter: Mutex::new(None),
            project_root: Mutex::new(None),
        }
    }

    pub async fn start(&self, adapter_cmd: &str, args: &[&str], cwd: &str, program: &str) -> Result<(), String> {
        let path = PathBuf::from(cwd);
        let dap = DapAdapter::spawn(adapter_cmd, args, &path).await?;

        // Send initialize request
        dap.send_request("initialize", Some(serde_json::json!({
            "clientID": "liminal",
            "adapterID": adapter_cmd,
            "supportsVariableType": true,
        }))).await?;

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
