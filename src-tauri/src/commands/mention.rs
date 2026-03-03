use tauri::State;

use crate::core::mention_resolver::{self, ResolvedMention};
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

#[tauri::command]
pub async fn resolve_mentions(
    state: State<'_, AppState>,
    prompt: String,
) -> Result<(String, Vec<ResolvedMention>), AppError> {
    let root = state
        .project_manager
        .get_active()
        .await
        .map(|p| p.root_path)
        .ok_or(AppError::Project(ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let result = mention_resolver::resolve_mentions(&prompt, &root)?;
    Ok(result)
}
