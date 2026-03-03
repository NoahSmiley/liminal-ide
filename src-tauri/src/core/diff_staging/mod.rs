pub mod hunk;

use std::collections::HashMap;
use serde::Serialize;
use tokio::sync::Mutex;

use hunk::{compute_diff, FileDiff};

#[derive(Clone, Debug, Serialize)]
pub struct StagedTurn {
    pub turn_id: String,
    pub files: Vec<FileDiff>,
}

pub struct DiffStager {
    staged: Mutex<Option<StagedTurn>>,
    snapshots: Mutex<HashMap<String, Option<String>>>,
}

impl DiffStager {
    pub fn new() -> Self {
        Self {
            staged: Mutex::new(None),
            snapshots: Mutex::new(HashMap::new()),
        }
    }

    pub async fn begin_staging(&self, turn_id: &str) {
        *self.staged.lock().await = Some(StagedTurn {
            turn_id: turn_id.to_string(),
            files: Vec::new(),
        });
        self.snapshots.lock().await.clear();
    }

    pub async fn record_snapshot(&self, path: &str, before: Option<String>) {
        self.snapshots.lock().await.insert(path.to_string(), before);
    }

    pub async fn stage_file(&self, path: &str, after: &str) {
        let before = self.snapshots.lock().await.get(path).cloned().flatten();
        let hunks = compute_diff(before.as_deref(), after);
        let diff = FileDiff {
            path: path.to_string(),
            hunks,
            before,
            after: after.to_string(),
        };
        if let Some(ref mut turn) = *self.staged.lock().await {
            turn.files.retain(|f| f.path != path);
            turn.files.push(diff);
        }
    }

    pub async fn get_staged(&self) -> Option<StagedTurn> {
        self.staged.lock().await.clone()
    }

    pub async fn accept_file(&self, path: &str) {
        if let Some(ref mut turn) = *self.staged.lock().await {
            turn.files.retain(|f| f.path != path);
        }
    }

    pub async fn reject_file(&self, path: &str) -> Option<FileDiff> {
        let mut staged = self.staged.lock().await;
        if let Some(ref mut turn) = *staged {
            let idx = turn.files.iter().position(|f| f.path == path);
            idx.map(|i| turn.files.remove(i))
        } else {
            None
        }
    }

    pub async fn accept_all(&self) {
        *self.staged.lock().await = None;
        self.snapshots.lock().await.clear();
    }

    pub async fn reject_all(&self) -> Vec<FileDiff> {
        let turn = self.staged.lock().await.take();
        self.snapshots.lock().await.clear();
        turn.map(|t| t.files).unwrap_or_default()
    }
}
