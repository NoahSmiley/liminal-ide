use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

use crate::core::project::{Project, ProjectSummary};
use crate::core::watcher;
use crate::error::AppError;
use crate::state::AppState;

fn resolve_path(raw: &str) -> PathBuf {
    let p = PathBuf::from(raw);
    if p.is_absolute() {
        p
    } else {
        dirs_next::home_dir().unwrap_or_else(|| PathBuf::from(".")).join(raw)
    }
}

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .create_project(name, resolve_path(&path))
        .await?;
    start_watcher(&state, &project.root_path).await;
    Ok(project)
}

#[tauri::command]
pub async fn open_project(
    state: State<'_, AppState>,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .open_project(resolve_path(&path))
        .await?;
    start_watcher(&state, &project.root_path).await;
    *state.cli_session_id.lock().await = None;
    Ok(project)
}

async fn start_watcher(state: &AppState, root: &std::path::Path) {
    let mut w = state.file_watcher.lock().await;
    *w = None;
    match watcher::start_watching(root, state.event_bus.clone()) {
        Ok(handle) => *w = Some(handle),
        Err(e) => eprintln!("[liminal] file watcher failed: {e}"),
    }
}

#[tauri::command]
pub async fn remove_project(
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), AppError> {
    state.project_manager.remove_project(id).await?;
    Ok(())
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
) -> Result<Vec<ProjectSummary>, AppError> {
    let projects = state.project_manager.list_projects().await;
    Ok(projects)
}

#[tauri::command]
pub async fn get_active_project(
    state: State<'_, AppState>,
) -> Result<Option<Project>, AppError> {
    let project = state.project_manager.get_active().await;
    Ok(project)
}
