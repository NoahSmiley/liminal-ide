use tauri::State;

use crate::core::agents::AgentTemplate;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_agents(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Vec<AgentTemplate>, AppError> {
    let project_root = state.project_manager.get_active().await.map(|p| p.root_path);
    Ok(crate::core::agents::AgentManager::list(project_root.as_deref()))
}

#[tauri::command]
pub async fn save_agent(
    state: State<'_, std::sync::Arc<AppState>>,
    template: AgentTemplate,
) -> Result<(), AppError> {
    let project = state.project_manager.get_active().await
        .ok_or_else(|| AppError::Settings(crate::error::SettingsError::SaveFailed("No active project".into())))?;
    crate::core::agents::AgentManager::save(&project.root_path, &template)
        .map_err(|e| AppError::Settings(crate::error::SettingsError::SaveFailed(e)))
}

#[tauri::command]
pub async fn delete_agent(
    state: State<'_, std::sync::Arc<AppState>>,
    id: String,
) -> Result<(), AppError> {
    let project = state.project_manager.get_active().await
        .ok_or_else(|| AppError::Settings(crate::error::SettingsError::SaveFailed("No active project".into())))?;
    crate::core::agents::AgentManager::delete(&project.root_path, &id)
        .map_err(|e| AppError::Settings(crate::error::SettingsError::SaveFailed(e)))
}

#[tauri::command]
pub async fn set_active_agent(
    state: State<'_, std::sync::Arc<AppState>>,
    template: Option<AgentTemplate>,
) -> Result<(), AppError> {
    state.agent_manager.set_active(template).await;
    Ok(())
}

#[tauri::command]
pub async fn get_active_agent(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<Option<AgentTemplate>, AppError> {
    Ok(state.agent_manager.get_active().await)
}
