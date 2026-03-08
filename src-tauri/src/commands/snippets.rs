use tauri::State;

use crate::core::snippets::Snippet;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_snippets(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<Snippet>, AppError> {
    Ok(state.snippet_manager.list().await)
}

#[tauri::command]
pub async fn add_snippet(
    state: State<'_, std::sync::Arc<AppState>>,
    title: String,
    language: String,
    content: String,
) -> Result<Snippet, AppError> {
    state.snippet_manager.add(title, language, content).await
        .map_err(|e| AppError::Settings(crate::error::SettingsError::SaveFailed(e)))
}

#[tauri::command]
pub async fn remove_snippet(
    state: State<'_, std::sync::Arc<AppState>>,
    id: String,
) -> Result<(), AppError> {
    state.snippet_manager.remove(&id).await
        .map_err(|e| AppError::Settings(crate::error::SettingsError::SaveFailed(e)))
}
