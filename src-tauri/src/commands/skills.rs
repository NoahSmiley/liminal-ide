use tauri::State;

use crate::core::skills::{Skill, SkillScanner};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_skills(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<Skill>, AppError> {
    let project_root = state.project_manager.get_active().await.map(|p| p.root_path);
    Ok(SkillScanner::scan_skills(project_root.as_deref()))
}
