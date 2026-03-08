use tauri::State;

use crate::core::git::diff::{self, GitFileDiff};
use crate::core::git::log::{self, GitCommit};
use crate::core::git::status::{self, GitStatus};
use crate::core::git::GitManager;
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

#[tauri::command]
pub async fn get_git_status(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<GitStatus, AppError> {
    let root = active_root(&state).await?;
    let mgr = GitManager::new(root);
    let repo = mgr.open_repo()?;
    let result = status::get_status(&repo)?;
    Ok(result)
}

#[tauri::command]
pub async fn get_git_log(
    state: State<'_, std::sync::Arc<AppState>>,
    limit: Option<usize>,
) -> Result<Vec<GitCommit>, AppError> {
    let root = active_root(&state).await?;
    let mgr = GitManager::new(root);
    let repo = mgr.open_repo()?;
    let result = log::get_log(&repo, limit.unwrap_or(50))?;
    Ok(result)
}

#[tauri::command]
pub async fn get_git_diff(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<GitFileDiff>, AppError> {
    let root = active_root(&state).await?;
    let mgr = GitManager::new(root);
    let repo = mgr.open_repo()?;
    let result = diff::get_diff(&repo)?;
    Ok(result)
}

async fn active_root(
    state: &State<'_, std::sync::Arc<AppState>>,
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
