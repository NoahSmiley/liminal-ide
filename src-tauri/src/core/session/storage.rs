use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::error::SessionError;

use super::Session;

fn sessions_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("sessions")
}

fn session_path(data_dir: &Path, id: &str) -> PathBuf {
    sessions_dir(data_dir).join(format!("{id}.json"))
}

pub fn save(data_dir: &Path, session: &Session) -> Result<(), SessionError> {
    let dir = sessions_dir(data_dir);
    std::fs::create_dir_all(&dir)
        .map_err(|e| SessionError::StorageFailed(e.to_string()))?;

    let path = session_path(data_dir, &session.id.to_string());
    let json = serde_json::to_string_pretty(session)
        .map_err(|e| SessionError::StorageFailed(e.to_string()))?;

    std::fs::write(&path, json)
        .map_err(|e| SessionError::StorageFailed(e.to_string()))?;
    Ok(())
}

pub fn load(data_dir: &Path, session_id: &str) -> Result<Session, SessionError> {
    let path = session_path(data_dir, session_id);
    let json = std::fs::read_to_string(&path)
        .map_err(|_| SessionError::NotFound(session_id.to_string()))?;

    serde_json::from_str(&json)
        .map_err(|e| SessionError::CorruptedHistory(e.to_string()))
}

pub fn list_ids(data_dir: &Path) -> Vec<String> {
    let dir = sessions_dir(data_dir);
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };

    entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.strip_suffix(".json").map(String::from)
        })
        .collect()
}

/// Scan disk for sessions, optionally filtered by project. Sorted by updated_at desc.
pub fn find_by_project(data_dir: &Path, project_id: Option<Uuid>) -> Vec<Session> {
    let ids = list_ids(data_dir);
    let mut matches: Vec<Session> = ids
        .iter()
        .filter_map(|id| load(data_dir, id).ok())
        .filter(|s| match project_id {
            Some(pid) => s.project_id == Some(pid),
            None => true,
        })
        .collect();
    matches.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    matches
}
