pub mod snapshot;

use serde::Serialize;
use std::collections::HashMap;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChangeType {
    Created,
    Modified,
}

#[derive(Clone, Debug, Serialize)]
pub struct FileChange {
    pub path: String,
    pub change_type: ChangeType,
    pub before: Option<String>,
    pub after: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct ChangeTurn {
    pub turn_id: Uuid,
    pub session_id: Uuid,
    pub changes: Vec<FileChange>,
    pub completed: bool,
}

pub struct ChangeTracker {
    active_turn: Mutex<Option<ChangeTurn>>,
    history: Mutex<HashMap<Uuid, ChangeTurn>>,
}

impl ChangeTracker {
    pub fn new() -> Self {
        Self {
            active_turn: Mutex::new(None),
            history: Mutex::new(HashMap::new()),
        }
    }

    pub async fn begin_turn(&self, session_id: Uuid) -> Uuid {
        let turn_id = Uuid::new_v4();
        let turn = ChangeTurn {
            turn_id,
            session_id,
            changes: Vec::new(),
            completed: false,
        };
        *self.active_turn.lock().await = Some(turn);
        turn_id
    }

    pub async fn record_change(&self, change: FileChange) {
        let mut active = self.active_turn.lock().await;
        if let Some(turn) = active.as_mut() {
            turn.changes.push(change);
        }
    }

    pub async fn complete_turn(&self) -> Option<ChangeTurn> {
        let mut active = self.active_turn.lock().await;
        let mut turn = active.take()?;
        turn.completed = true;
        let mut history = self.history.lock().await;
        history.insert(turn.turn_id, turn.clone());
        Some(turn)
    }

    pub async fn list_turns(&self) -> Vec<ChangeTurn> {
        let history = self.history.lock().await;
        let mut turns: Vec<_> = history.values().cloned().collect();
        turns.sort_by_key(|t| t.turn_id);
        turns
    }

    pub async fn get_turn(&self, turn_id: Uuid) -> Option<ChangeTurn> {
        let history = self.history.lock().await;
        history.get(&turn_id).cloned()
    }
}
