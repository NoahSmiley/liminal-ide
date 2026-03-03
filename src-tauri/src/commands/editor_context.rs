use tauri::State;

use crate::core::editor_context::EditorContext;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn update_editor_context(
    state: State<'_, AppState>,
    context: EditorContext,
) -> Result<(), AppError> {
    state.editor_context_manager.update(context).await;
    Ok(())
}
