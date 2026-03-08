use std::path::Path;
use tauri::State;

use crate::core::events::{AppEvent, FsEvent};
use crate::core::filesystem::tree::TreeNode;
use crate::core::filesystem::{DirEntry, FileContent};
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

async fn require_active_root(
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

#[tauri::command]
pub async fn read_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<FileContent, AppError> {
    let root = require_active_root(&state).await?;
    let content = state.fs_manager.read_file(&root, Path::new(&path))?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let root = require_active_root(&state).await?;
    state.fs_manager.write_file(&root, Path::new(&path), &content)?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<Vec<DirEntry>, AppError> {
    let root = require_active_root(&state).await?;
    let entries = state.fs_manager.list_directory(&root, Path::new(&path))?;
    Ok(entries)
}

#[tauri::command]
pub async fn rename_file(
    state: State<'_, std::sync::Arc<AppState>>,
    old_path: String,
    new_path: String,
) -> Result<(), AppError> {
    let root = require_active_root(&state).await?;
    state.fs_manager.rename_file(&root, Path::new(&old_path), Path::new(&new_path))?;
    state.event_bus.emit(AppEvent::Fs(FsEvent::FileRenamed {
        old_path,
        new_path,
    }));
    Ok(())
}

#[tauri::command]
pub async fn delete_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<(), AppError> {
    let root = require_active_root(&state).await?;
    state.fs_manager.delete_file(&root, Path::new(&path))?;
    state.event_bus.emit(AppEvent::Fs(FsEvent::FileDeleted {
        path,
    }));
    Ok(())
}

#[tauri::command]
pub async fn list_tree(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
    depth: Option<usize>,
) -> Result<Vec<TreeNode>, AppError> {
    let root = require_active_root(&state).await?;
    let target = root.join(&path);
    let nodes = crate::core::filesystem::tree::build_tree(
        &target,
        depth.unwrap_or(1),
    )?;
    Ok(nodes)
}
