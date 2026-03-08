pub mod storage;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::SessionError;

fn now_unix() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    #[serde(default)]
    pub project_id: Option<Uuid>,
    pub messages: Vec<Message>,
    #[serde(default)]
    pub cli_session_id: Option<String>,
    #[serde(default)]
    pub updated_at: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct SessionSummary {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub message_count: usize,
    pub preview: String,
}

#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<Uuid, Session>>>,
    data_dir: Option<PathBuf>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self { sessions: Arc::new(Mutex::new(HashMap::new())), data_dir: None }
    }

    pub fn with_data_dir(data_dir: PathBuf) -> Self {
        Self { sessions: Arc::new(Mutex::new(HashMap::new())), data_dir: Some(data_dir) }
    }

    pub async fn create_session(&self, project_id: Option<Uuid>) -> Session {
        let session = Session {
            id: Uuid::new_v4(),
            project_id,
            messages: Vec::new(),
            cli_session_id: None,
            updated_at: now_unix(),
        };
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session.id, session.clone());
        if let Some(dir) = &self.data_dir {
            let _ = storage::save(dir, &session);
        }
        session
    }

    pub async fn append_message(
        &self,
        session_id: Uuid,
        message: Message,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(&session_id)
            .ok_or(SessionError::NotFound(session_id.to_string()))?;
        session.messages.push(message);
        session.updated_at = now_unix();
        if let Some(dir) = &self.data_dir {
            let _ = storage::save(dir, session);
        }
        Ok(())
    }

    pub async fn set_cli_session_id(
        &self,
        session_id: Uuid,
        cli_id: String,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(&session_id)
            .ok_or(SessionError::NotFound(session_id.to_string()))?;
        session.cli_session_id = Some(cli_id);
        if let Some(dir) = &self.data_dir {
            let _ = storage::save(dir, session);
        }
        Ok(())
    }

    pub async fn get_session(&self, session_id: Uuid) -> Result<Session, SessionError> {
        let sessions = self.sessions.lock().await;
        if let Some(s) = sessions.get(&session_id) {
            return Ok(s.clone());
        }
        drop(sessions);

        if let Some(dir) = &self.data_dir {
            let session = storage::load(dir, &session_id.to_string())?;
            let mut sessions = self.sessions.lock().await;
            sessions.insert(session.id, session.clone());
            return Ok(session);
        }

        Err(SessionError::NotFound(session_id.to_string()))
    }

    pub async fn find_latest_for_project(&self, project_id: Uuid) -> Option<Session> {
        let Some(dir) = &self.data_dir else { return None };
        let sessions = storage::find_by_project(dir, Some(project_id));
        let latest = sessions.into_iter().next()?;
        let mut cache = self.sessions.lock().await;
        cache.insert(latest.id, latest.clone());
        Some(latest)
    }

    pub async fn list_sessions(&self, project_id: Option<Uuid>) -> Vec<SessionSummary> {
        let sessions = self.sessions.lock().await;
        sessions
            .values()
            .filter(|s| match project_id {
                Some(pid) => s.project_id == Some(pid),
                None => true,
            })
            .map(|s| SessionSummary {
                id: s.id,
                project_id: s.project_id,
                message_count: s.messages.len(),
                preview: s.messages.first()
                    .map(|m| m.content.chars().take(80).collect())
                    .unwrap_or_default(),
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn create_and_retrieve_session() {
        let mgr = SessionManager::new();
        let project_id = Some(Uuid::new_v4());
        let session = mgr.create_session(project_id).await;
        let retrieved = mgr.get_session(session.id).await.expect("session not found");
        assert_eq!(retrieved.id, session.id);
    }

    #[tokio::test]
    async fn append_message_to_session() {
        let mgr = SessionManager::new();
        let session = mgr.create_session(Some(Uuid::new_v4())).await;
        mgr.append_message(
            session.id,
            Message { role: Role::User, content: "hello".into() },
        )
        .await
        .expect("append failed");
        let updated = mgr.get_session(session.id).await.expect("not found");
        assert_eq!(updated.messages.len(), 1);
        assert_eq!(updated.messages[0].content, "hello");
    }

    #[tokio::test]
    async fn get_nonexistent_session_fails() {
        let mgr = SessionManager::new();
        let result = mgr.get_session(Uuid::new_v4()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn persistence_round_trip() {
        let dir = std::env::temp_dir().join("liminal-session-test");
        let _ = std::fs::remove_dir_all(&dir);
        let mgr = SessionManager::with_data_dir(dir.clone());
        let session = mgr.create_session(Some(Uuid::new_v4())).await;
        mgr.append_message(
            session.id,
            Message { role: Role::User, content: "persisted".into() },
        )
        .await
        .unwrap();

        let mgr2 = SessionManager::with_data_dir(dir.clone());
        let loaded = mgr2.get_session(session.id).await.expect("load failed");
        assert_eq!(loaded.messages.len(), 1);
        assert_eq!(loaded.messages[0].content, "persisted");
        let _ = std::fs::remove_dir_all(&dir);
    }
}
