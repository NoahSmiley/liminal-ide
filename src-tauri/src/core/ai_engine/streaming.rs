use std::path::Path;
use uuid::Uuid;

use crate::core::change_tracker::ChangeTracker;
use crate::core::events::EventBus;
use crate::core::settings::schema::PermissionMode;
use crate::error::AiError;

use super::cli::{stream_session, SessionResult};

/// Streams a Claude response. The CLI handles its own agentic loop internally.
pub async fn stream_claude_response(
    event_bus: &EventBus,
    session_id: Uuid,
    prompt: &str,
    system_prompt: &str,
    model: &str,
    resume_id: Option<&str>,
    project_root: Option<&Path>,
    change_tracker: &ChangeTracker,
    permission_mode: &PermissionMode,
) -> Result<SessionResult, AiError> {
    stream_session(
        event_bus, session_id, prompt, system_prompt,
        model, resume_id, project_root, change_tracker,
        permission_mode,
    )
    .await
}
