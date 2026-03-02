use std::path::PathBuf;
use tauri::State;

use crate::core::project::{Project, ProjectSummary};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .create_project(name, PathBuf::from(path))
        .await?;
    Ok(project)
}

#[tauri::command]
pub async fn open_project(
    state: State<'_, AppState>,
    path: String,
) -> Result<Project, AppError> {
    let project = state
        .project_manager
        .open_project(PathBuf::from(path))
        .await?;
    Ok(project)
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
