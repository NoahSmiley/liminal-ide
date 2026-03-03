use tauri::State;

use crate::core::search::{self, SearchOptions, SearchResult};
use crate::error::{AppError, ProjectError};
use crate::state::AppState;

#[tauri::command]
pub async fn search_project(
    state: State<'_, AppState>,
    query: String,
    case_sensitive: Option<bool>,
    regex: Option<bool>,
) -> Result<Vec<SearchResult>, AppError> {
    let root = state
        .project_manager
        .get_active()
        .await
        .map(|p| p.root_path)
        .ok_or(AppError::Project(ProjectError::InvalidPath(
            "No active project".into(),
        )))?;
    let options = SearchOptions {
        case_sensitive: case_sensitive.unwrap_or(false),
        regex: regex.unwrap_or(false),
        ..Default::default()
    };
    let results = search::search_project(&root, &query, &options)?;
    Ok(results)
}
