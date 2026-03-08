use tauri::State;
use uuid::Uuid;

use crate::core::context_pin::PinnedContext;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn pin_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<PinnedContext, AppError> {
    let pin = state.context_pin_manager.pin_file(path).await;
    Ok(pin)
}

#[tauri::command]
pub async fn pin_context(
    state: State<'_, std::sync::Arc<AppState>>,
    label: String,
    content: String,
) -> Result<PinnedContext, AppError> {
    let pin = state.context_pin_manager.pin_text(label, content).await;
    Ok(pin)
}

#[tauri::command]
pub async fn unpin_context(
    state: State<'_, std::sync::Arc<AppState>>,
    id: Uuid,
) -> Result<(), AppError> {
    state.context_pin_manager.unpin(id).await;
    Ok(())
}

#[tauri::command]
pub async fn list_pinned(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<PinnedContext>, AppError> {
    Ok(state.context_pin_manager.list().await)
}
