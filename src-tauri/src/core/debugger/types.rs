use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Breakpoint {
    pub id: u32,
    pub path: String,
    pub line: u32,
    pub verified: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StackFrame {
    pub id: u32,
    pub name: String,
    pub source_path: Option<String>,
    pub line: u32,
    pub column: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    pub value: String,
    pub kind: String,
    pub children_ref: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "state")]
pub enum DebugState {
    Stopped,
    Running,
    Paused { reason: String },
    Exited { code: i32 },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DebugSession {
    pub state: DebugState,
    pub breakpoints: Vec<Breakpoint>,
    pub stack_frames: Vec<StackFrame>,
    pub variables: Vec<Variable>,
    pub thread_id: Option<u32>,
}

impl DebugSession {
    pub fn new() -> Self {
        Self {
            state: DebugState::Stopped,
            breakpoints: Vec::new(),
            stack_frames: Vec::new(),
            variables: Vec::new(),
            thread_id: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn debug_session_new_starts_stopped() {
        let session = DebugSession::new();
        match session.state {
            DebugState::Stopped => {}
            _ => panic!("expected Stopped state"),
        }
        assert!(session.breakpoints.is_empty());
        assert!(session.stack_frames.is_empty());
        assert!(session.variables.is_empty());
        assert!(session.thread_id.is_none());
    }

    #[test]
    fn debug_state_variants_serialize_with_state_tag() {
        let stopped = serde_json::to_value(&DebugState::Stopped).unwrap();
        assert_eq!(stopped["state"], "Stopped");

        let running = serde_json::to_value(&DebugState::Running).unwrap();
        assert_eq!(running["state"], "Running");

        let paused = serde_json::to_value(&DebugState::Paused {
            reason: "breakpoint".to_string(),
        }).unwrap();
        assert_eq!(paused["state"], "Paused");
        assert_eq!(paused["reason"], "breakpoint");

        let exited = serde_json::to_value(&DebugState::Exited { code: 0 }).unwrap();
        assert_eq!(exited["state"], "Exited");
        assert_eq!(exited["code"], 0);
    }

    #[test]
    fn breakpoint_serializes_correctly() {
        let bp = Breakpoint {
            id: 1,
            path: "/src/main.rs".to_string(),
            line: 42,
            verified: true,
        };
        let json = serde_json::to_value(&bp).unwrap();
        assert_eq!(json["id"], 1);
        assert_eq!(json["path"], "/src/main.rs");
        assert_eq!(json["line"], 42);
        assert_eq!(json["verified"], true);
    }

    #[test]
    fn stack_frame_serializes_correctly() {
        let frame = StackFrame {
            id: 5,
            name: "main".to_string(),
            source_path: Some("/src/main.rs".to_string()),
            line: 10,
            column: 1,
        };
        let json = serde_json::to_value(&frame).unwrap();
        assert_eq!(json["id"], 5);
        assert_eq!(json["name"], "main");
        assert_eq!(json["source_path"], "/src/main.rs");
        assert_eq!(json["line"], 10);
        assert_eq!(json["column"], 1);
    }

    #[test]
    fn variable_serializes_correctly() {
        let var = Variable {
            name: "x".to_string(),
            value: "42".to_string(),
            kind: "int".to_string(),
            children_ref: 0,
        };
        let json = serde_json::to_value(&var).unwrap();
        assert_eq!(json["name"], "x");
        assert_eq!(json["value"], "42");
        assert_eq!(json["kind"], "int");
        assert_eq!(json["children_ref"], 0);
    }
}
