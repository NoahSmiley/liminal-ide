use tauri::State;

use crate::core::diff_staging::StagedTurn;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn get_staged_diffs(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Option<StagedTurn>, AppError> {
    Ok(state.diff_stager.get_staged().await)
}

#[tauri::command]
pub async fn accept_diff_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<(), AppError> {
    state.diff_stager.accept_file(&path).await;
    Ok(())
}

#[tauri::command]
pub async fn reject_diff_file(
    state: State<'_, std::sync::Arc<AppState>>,
    path: String,
) -> Result<(), AppError> {
    if let Some(diff) = state.diff_stager.reject_file(&path).await {
        // Revert file to before state
        if let Some(before) = &diff.before {
            let root = state.project_manager.get_active().await.map(|p| p.root_path);
            if let Some(root) = root {
                state.fs_manager.write_file(&root, std::path::Path::new(&path), before)?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn accept_all_diffs(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<(), AppError> {
    state.diff_stager.accept_all().await;
    Ok(())
}

#[tauri::command]
pub async fn reject_all_diffs(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<(), AppError> {
    let diffs = state.diff_stager.reject_all().await;
    let root = state.project_manager.get_active().await.map(|p| p.root_path);
    if let Some(root) = root {
        for diff in &diffs {
            if let Some(before) = &diff.before {
                let _ = state.fs_manager.write_file(&root, std::path::Path::new(&diff.path), before);
            }
        }
    }
    Ok(())
}
