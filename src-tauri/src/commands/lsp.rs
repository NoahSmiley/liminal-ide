use std::path::PathBuf;

use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn lsp_start(
    state: State<'_, AppState>,
    project_root: String,
) -> Result<Vec<String>, AppError> {
    let root = PathBuf::from(project_root);
    let started = state
        .lsp_manager
        .start_for_project(root, state.event_bus.clone())
        .await?;
    Ok(started)
}

#[tauri::command]
pub async fn lsp_stop(state: State<'_, AppState>) -> Result<(), AppError> {
    state.lsp_manager.stop_all().await;
    Ok(())
}

#[tauri::command]
pub async fn lsp_open_document(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
    content: String,
    language_id: String,
) -> Result<(), AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": {
            "uri": uri,
            "languageId": language_id,
            "version": 1,
            "text": content,
        }
    });
    state
        .lsp_manager
        .notify(&server_name, "textDocument/didOpen", params)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn lsp_did_change(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
    content: String,
    version: u32,
) -> Result<(), AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": { "uri": uri, "version": version },
        "contentChanges": [{ "text": content }],
    });
    state
        .lsp_manager
        .notify(&server_name, "textDocument/didChange", params)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn lsp_close_document(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
) -> Result<(), AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": { "uri": uri }
    });
    state
        .lsp_manager
        .notify(&server_name, "textDocument/didClose", params)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn lsp_request_completion(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": { "uri": uri },
        "position": { "line": line, "character": character },
    });
    let result = state
        .lsp_manager
        .request(&server_name, "textDocument/completion", params)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn lsp_goto_definition(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": { "uri": uri },
        "position": { "line": line, "character": character },
    });
    let result = state
        .lsp_manager
        .request(&server_name, "textDocument/definition", params)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn lsp_hover(
    state: State<'_, AppState>,
    server_name: String,
    path: String,
    line: u32,
    character: u32,
) -> Result<serde_json::Value, AppError> {
    let uri = format!("file://{}", path);
    let params = serde_json::json!({
        "textDocument": { "uri": uri },
        "position": { "line": line, "character": character },
    });
    let result = state
        .lsp_manager
        .request(&server_name, "textDocument/hover", params)
        .await?;
    Ok(result)
}
