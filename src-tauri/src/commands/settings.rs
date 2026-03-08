use tauri::State;

use crate::core::events::{AppEvent, SettingsEvent};
use crate::core::settings::schema::Settings;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn get_settings(state: State<'_, std::sync::Arc<AppState>>) -> Result<Settings, AppError> {
    let settings = state.settings_manager.get().await;
    Ok(settings)
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, std::sync::Arc<AppState>>,
    settings: Settings,
) -> Result<Settings, AppError> {
    state.settings_manager.update(settings.clone()).await?;
    state.event_bus.emit(AppEvent::Settings(SettingsEvent::Updated {
        settings: settings.clone(),
    }));
    Ok(settings)
}

#[tauri::command]
pub async fn reset_settings(state: State<'_, std::sync::Arc<AppState>>) -> Result<Settings, AppError> {
    let settings = state.settings_manager.reset().await?;
    state.event_bus.emit(AppEvent::Settings(SettingsEvent::Updated {
        settings: settings.clone(),
    }));
    Ok(settings)
}
