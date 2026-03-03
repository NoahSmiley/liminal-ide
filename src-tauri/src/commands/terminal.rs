use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, ProjectError};
use crate::state::AppState;

#[tauri::command]
pub async fn spawn_terminal(
    state: State<'_, AppState>,
) -> Result<Uuid, AppError> {
    let project = state
        .project_manager
        .get_active()
        .await
        .ok_or(AppError::Project(ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let id = state
        .terminal_manager
        .spawn_shell(project.root_path, state.event_bus.clone())
        .await?;
    Ok(id)
}

#[tauri::command]
pub async fn send_terminal_input(
    state: State<'_, AppState>,
    terminal_id: Uuid,
    input: String,
) -> Result<(), AppError> {
    state
        .terminal_manager
        .send_input(terminal_id, &input)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn list_terminals(
    state: State<'_, AppState>,
) -> Result<Vec<Uuid>, AppError> {
    Ok(state.terminal_manager.list().await)
}

#[tauri::command]
pub async fn kill_terminal(
    state: State<'_, AppState>,
    terminal_id: Uuid,
) -> Result<(), AppError> {
    state.terminal_manager.kill(terminal_id).await?;
    Ok(())
}
