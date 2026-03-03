use tauri::State;
use uuid::Uuid;

use crate::core::session::{Session, SessionSummary};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn create_session(
    state: State<'_, AppState>,
    project_id: Uuid,
) -> Result<Session, AppError> {
    let session = state.session_manager.create_session(project_id).await;
    Ok(session)
}

#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
    session_id: Uuid,
) -> Result<Session, AppError> {
    let session = state.session_manager.get_session(session_id).await?;
    Ok(session)
}

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    project_id: Uuid,
) -> Result<Vec<SessionSummary>, AppError> {
    let sessions = state.session_manager.list_sessions(project_id).await;
    Ok(sessions)
}

#[tauri::command]
pub async fn get_or_create_session(
    state: State<'_, AppState>,
    project_id: Uuid,
) -> Result<Session, AppError> {
    if let Some(session) = state.session_manager.find_latest_for_project(project_id).await {
        return Ok(session);
    }
    let session = state.session_manager.create_session(project_id).await;
    Ok(session)
}
