use tauri::State;

use crate::core::plugins::PluginInfo;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn list_plugins(
    state: State<'_, AppState>,
) -> Result<Vec<PluginInfo>, AppError> {
    Ok(state.plugin_manager.scan_plugins())
}

#[tauri::command]
pub async fn run_plugin_command(
    state: State<'_, AppState>,
    plugin_name: String,
    command_name: String,
) -> Result<String, AppError> {
    let project_root = state.project_manager.get_active().await.map(|p| p.root_path);
    state.plugin_manager
        .execute_command(&plugin_name, &command_name, project_root.as_deref())
        .map_err(|e| AppError::Settings(crate::error::SettingsError::SaveFailed(e)))
}
