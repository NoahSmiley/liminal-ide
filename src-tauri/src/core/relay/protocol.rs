use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    AuthResult {
        success: bool,
        token: Option<String>,
        error: Option<String>,
    },
    Event {
        event_id: Uuid,
        timestamp: i64,
        category: String,
        data: Value,
    },
    Notification {
        id: Uuid,
        timestamp: i64,
        kind: String,
        title: String,
        body: String,
        priority: String,
    },
    CommandResult {
        command_id: Uuid,
        success: bool,
        data: Option<Value>,
        error: Option<String>,
    },
    InitialState {
        sessions: Value,
        active_session: Option<Uuid>,
        terminals: Value,
        project: Option<Value>,
    },
    Pong,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    Authenticate {
        method: AuthMethod,
        device_name: String,
        device_id: String,
    },
    Command {
        id: Uuid,
        command: RelayCommand,
    },
    Ping,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "method")]
pub enum AuthMethod {
    PairingCode { code: String },
    Token { token: String },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "command", content = "args")]
pub enum RelayCommand {
    SendMessage { session_id: Uuid, content: String },
    CancelAiTask,
    TerminalInput { terminal_id: Uuid, input: String },
    SpawnTerminal,
    ApproveChange { turn_id: String, path: String },
    RejectChange { turn_id: String, path: String },
    GetSessionState { session_id: Uuid },
    ListSessions,
    CreateSession { name: Option<String> },
    GetInitialState,
}
