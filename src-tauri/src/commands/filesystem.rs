use std::path::Path;
use tauri::State;

use crate::core::filesystem::{DirEntry, FileContent};
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

async fn require_active_root(
    state: &State<'_, AppState>,
) -> Result<std::path::PathBuf, AppError> {
    state
        .project_manager
        .get_active()
        .await
        .map(|p| p.root_path)
        .ok_or(AppError::Project(ProjectError::InvalidPath(
            "No active project".into(),
        )))
}

#[tauri::command]
pub async fn read_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<FileContent, AppError> {
    let root = require_active_root(&state).await?;
    let content = state.fs_manager.read_file(&root, Path::new(&path))?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let root = require_active_root(&state).await?;
    state.fs_manager.write_file(&root, Path::new(&path), &content)?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<DirEntry>, AppError> {
    let root = require_active_root(&state).await?;
    let entries = state.fs_manager.list_directory(&root, Path::new(&path))?;
    Ok(entries)
}
