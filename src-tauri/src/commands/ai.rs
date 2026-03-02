use tauri::State;
use uuid::Uuid;

use crate::core::ai_engine::AiEngine;
use crate::core::events::{AiEvent, AppEvent};
use crate::core::session::{Message, Role};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    session_id: Uuid,
    content: String,
) -> Result<(), AppError> {
    // Append user message immediately
    state
        .session_manager
        .append_message(
            session_id,
            Message {
                role: Role::User,
                content: content.clone(),
            },
        )
        .await
        .map_err(AppError::Session)?;

    // Clone what we need for background task
    let event_bus = state.event_bus.clone();
    let session_manager = state.session_manager.clone();
    let model = state.ai_engine.model().to_string();

    // Spawn AI work in background so command returns immediately
    tokio::spawn(async move {
        eprintln!("[liminal] spawning claude for session {}", session_id);

        let result = crate::core::ai_engine::streaming::stream_claude_response(
            &event_bus,
            session_id,
            &content,
            AiEngine::system_prompt(),
            &model,
        )
        .await;

        match result {
            Ok(response) => {
                eprintln!("[liminal] claude responded ({} chars)", response.len());
                let _ = session_manager
                    .append_message(
                        session_id,
                        Message {
                            role: Role::Assistant,
                            content: response,
                        },
                    )
                    .await;
            }
            Err(e) => {
                eprintln!("[liminal] claude error: {}", e);
                event_bus.emit(AppEvent::Ai(AiEvent::Error {
                    session_id,
                    message: e.to_string(),
                }));
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn check_claude_status() -> Result<bool, AppError> {
    Ok(AiEngine::check_availability())
}
