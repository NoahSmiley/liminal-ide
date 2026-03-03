use tauri::State;
use crate::error::AppError;
use crate::state::AppState;
use crate::core::debugger::types::DebugSession;

#[tauri::command]
pub async fn debug_start(
    state: State<'_, AppState>,
    adapter: String,
    program: String,
) -> Result<(), AppError> {
    let root = state.project_manager.get_active().await
        .ok_or(AppError::Debug("No active project".to_string()))?
        .root_path.display().to_string();

    state.debug_manager.start(&adapter, &[], &root, &program)
        .await
        .map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_stop(state: State<'_, AppState>) -> Result<(), AppError> {
    state.debug_manager.stop().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_set_breakpoint(
    state: State<'_, AppState>,
    path: String,
    line: u32,
) -> Result<(), AppError> {
    state.debug_manager.set_breakpoint(&path, line).await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_remove_breakpoint(
    state: State<'_, AppState>,
    path: String,
    line: u32,
) -> Result<(), AppError> {
    state.debug_manager.remove_breakpoint(&path, line).await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_continue(state: State<'_, AppState>) -> Result<(), AppError> {
    state.debug_manager.continue_execution().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_step_over(state: State<'_, AppState>) -> Result<(), AppError> {
    state.debug_manager.step_over().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_step_into(state: State<'_, AppState>) -> Result<(), AppError> {
    state.debug_manager.step_into().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_step_out(state: State<'_, AppState>) -> Result<(), AppError> {
    state.debug_manager.step_out().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn debug_get_session(state: State<'_, AppState>) -> Result<DebugSession, AppError> {
    Ok(state.debug_manager.get_session().await)
}
