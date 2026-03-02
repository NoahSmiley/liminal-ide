use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::SessionError;

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

#[derive(Clone, Debug, Serialize)]
pub struct Session {
    pub id: Uuid,
    pub project_id: Uuid,
    pub messages: Vec<Message>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SessionSummary {
    pub id: Uuid,
    pub project_id: Uuid,
    pub message_count: usize,
    pub preview: String,
}

pub struct SessionManager {
    sessions: Mutex<HashMap<Uuid, Session>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn create_session(&self, project_id: Uuid) -> Session {
        let session = Session {
            id: Uuid::new_v4(),
            project_id,
            messages: Vec::new(),
        };
        let mut sessions = self.sessions.lock().await;
        sessions.insert(session.id, session.clone());
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
        Ok(())
    }

    pub async fn get_session(
        &self,
        session_id: Uuid,
    ) -> Result<Session, SessionError> {
        let sessions = self.sessions.lock().await;
        sessions
            .get(&session_id)
            .cloned()
            .ok_or(SessionError::NotFound(session_id.to_string()))
    }

    pub async fn list_sessions(&self, project_id: Uuid) -> Vec<SessionSummary> {
        let sessions = self.sessions.lock().await;
        sessions
            .values()
            .filter(|s| s.project_id == project_id)
            .map(|s| SessionSummary {
                id: s.id,
                project_id: s.project_id,
                message_count: s.messages.len(),
                preview: s
                    .messages
                    .first()
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
        let project_id = Uuid::new_v4();
        let session = mgr.create_session(project_id).await;
        let retrieved = mgr
            .get_session(session.id)
            .await
            .expect("session not found");
        assert_eq!(retrieved.id, session.id);
    }

    #[tokio::test]
    async fn append_message_to_session() {
        let mgr = SessionManager::new();
        let session = mgr.create_session(Uuid::new_v4()).await;
        mgr.append_message(
            session.id,
            Message {
                role: Role::User,
                content: "hello".into(),
            },
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
}
