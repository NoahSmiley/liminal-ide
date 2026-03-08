use tauri::State;
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn collab_create_room(
    state: State<'_, std::sync::Arc<AppState>>,
    server_url: String,
) -> Result<String, AppError> {
    state.collab_manager.create_room(&server_url)
        .await
        .map_err(AppError::Debug)
}

#[tauri::command]
pub async fn collab_join_room(
    state: State<'_, std::sync::Arc<AppState>>,
    server_url: String,
    room_id: String,
) -> Result<(), AppError> {
    state.collab_manager.join_room(&server_url, &room_id)
        .await
        .map_err(AppError::Debug)
}

#[tauri::command]
pub async fn collab_leave(state: State<'_, std::sync::Arc<AppState>>) -> Result<(), AppError> {
    state.collab_manager.leave().await.map_err(AppError::Debug)
}

#[tauri::command]
pub async fn collab_send_message(
    state: State<'_, std::sync::Arc<AppState>>,
    content: String,
) -> Result<(), AppError> {
    state.collab_manager.send_message(&content)
        .await
        .map_err(AppError::Debug)
}

#[tauri::command]
pub async fn collab_set_user_name(
    state: State<'_, std::sync::Arc<AppState>>,
    name: String,
) -> Result<(), AppError> {
    state.collab_manager.set_user_name(&name).await;
    Ok(())
}

#[tauri::command]
pub async fn collab_send_cursor_update(
    state: State<'_, std::sync::Arc<AppState>>,
    file: String,
    line: u32,
    col: u32,
) -> Result<(), AppError> {
    state.collab_manager.send_cursor_update(&file, line, col)
        .await
        .map_err(AppError::Debug)
}

#[tauri::command]
pub async fn collab_get_status(
    state: State<'_, std::sync::Arc<AppState>>,
) -> Result<CollabStatus, AppError> {
    Ok(CollabStatus {
        connected: state.collab_manager.is_connected().await,
        room_id: state.collab_manager.get_room_id().await,
    })
}

#[derive(serde::Serialize)]
pub struct CollabStatus {
    pub connected: bool,
    pub room_id: Option<String>,
}
