pub mod streaming;
pub mod types;

use uuid::Uuid;

use crate::core::events::EventBus;
use crate::core::session::{Message, Role, SessionManager};
use crate::error::AiError;

const DEFAULT_SYSTEM_PROMPT: &str =
    "You are Liminal, an AI coding assistant inside a terminal IDE. \
     You help users build software by writing code, creating files, \
     and running commands. Be concise and direct.";

pub struct AiEngine {
    model: String,
}

impl AiEngine {
    pub fn new(model: String) -> Self {
        Self { model }
    }

    pub async fn send_message(
        &self,
        event_bus: &EventBus,
        session_manager: &SessionManager,
        session_id: Uuid,
        user_message: String,
    ) -> Result<(), AiError> {
        session_manager
            .append_message(
                session_id,
                Message {
                    role: Role::User,
                    content: user_message.clone(),
                },
            )
            .await
            .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

        let response = streaming::stream_claude_response(
            event_bus,
            session_id,
            &user_message,
            DEFAULT_SYSTEM_PROMPT,
            &self.model,
        )
        .await?;

        session_manager
            .append_message(
                session_id,
                Message {
                    role: Role::Assistant,
                    content: response,
                },
            )
            .await
            .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

        Ok(())
    }

    pub fn check_availability() -> bool {
        std::process::Command::new("claude")
            .arg("--version")
            .output()
            .is_ok()
    }
}
