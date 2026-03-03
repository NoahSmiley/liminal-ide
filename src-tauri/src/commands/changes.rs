use tauri::State;
use uuid::Uuid;

use crate::core::change_tracker::ChangeTurn;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_change_history(
    state: State<'_, AppState>,
) -> Result<Vec<ChangeTurn>, AppError> {
    let tracker = state.change_tracker_arc();
    Ok(tracker.list_turns().await)
}

#[tauri::command]
pub async fn list_turn_changes(
    state: State<'_, AppState>,
    turn_id: Uuid,
) -> Result<ChangeTurn, AppError> {
    let tracker = state.change_tracker_arc();
    tracker
        .get_turn(turn_id)
        .await
        .ok_or_else(|| AppError::Change(crate::error::ChangeError::TurnNotFound(turn_id.to_string())))
}

#[tauri::command]
pub async fn revert_turn(
    state: State<'_, AppState>,
    turn_id: Uuid,
) -> Result<(), AppError> {
    let tracker = state.change_tracker_arc();
    let turn = tracker
        .get_turn(turn_id)
        .await
        .ok_or_else(|| AppError::Change(crate::error::ChangeError::TurnNotFound(turn_id.to_string())))?;

    let project = state.project_manager.get_active().await
        .ok_or_else(|| AppError::Change(crate::error::ChangeError::RevertFailed("no active project".into())))?;

    for change in &turn.changes {
        let full_path = project.root_path.join(&change.path);
        match &change.before {
            Some(content) => {
                std::fs::write(&full_path, content)
                    .map_err(|e| AppError::Change(crate::error::ChangeError::RevertFailed(e.to_string())))?;
            }
            None => {
                // File was created — remove it to revert
                let _ = std::fs::remove_file(&full_path);
            }
        }
    }
    Ok(())
}
