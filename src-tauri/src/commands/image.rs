use tauri::State;

use crate::core::image_handler;
use crate::error::AppError;
use crate::state::AppState;

#[derive(serde::Serialize)]
pub struct UploadResult {
    pub id: String,
    pub path: String,
    pub prompt_text: String,
}

#[tauri::command]
pub async fn upload_image(
    state: State<'_, std::sync::Arc<AppState>>,
    base64_data: String,
    mime_type: String,
) -> Result<UploadResult, AppError> {
    let data_dir = &state.config.data_dir;
    let image = image_handler::save_image(data_dir, &base64_data, &mime_type)?;
    let prompt_text = image_handler::format_image_prompt(&image);
    Ok(UploadResult {
        id: image.id,
        path: image.path.display().to_string(),
        prompt_text,
    })
}
