use tauri::State;

use crate::core::todo_tracker::{self, item::TodoItem};
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

#[tauri::command]
pub async fn scan_todos(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<TodoItem>, AppError> {
    let root = state
        .project_manager
        .get_active()
        .await
        .map(|p| p.root_path)
        .ok_or(AppError::Project(ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    Ok(todo_tracker::scan_todos(&root))
}
