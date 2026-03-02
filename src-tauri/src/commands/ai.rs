use tauri::State;
use uuid::Uuid;

use crate::core::ai_engine::AiEngine;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    session_id: Uuid,
    content: String,
) -> Result<(), AppError> {
    state
        .ai_engine
        .send_message(
            &state.event_bus,
            &state.session_manager,
            session_id,
            content,
        )
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn check_claude_status() -> Result<bool, AppError> {
    Ok(AiEngine::check_availability())
}
