use std::time::Duration;
use tauri::State;
use uuid::Uuid;

use crate::core::ai_engine::AiEngine;
use crate::core::events::{AiEvent, AppEvent, LintEvent};
use crate::core::lint_runner;
use crate::core::session::{Message, Role};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    session_id: Uuid,
    content: String,
) -> Result<(), AppError> {
    state
        .session_manager
        .append_message(
            session_id,
            Message { role: Role::User, content: content.clone() },
        )
        .await
        .map_err(AppError::Session)?;

    let event_bus = state.event_bus.clone();
    let session_manager = state.session_manager.clone();
    let model = state.ai_engine.model().to_string();
    let project_root = state.project_manager.get_active().await.map(|p| p.root_path);
    let timeout_secs = state.config.claude_timeout_seconds;
    let session = state.session_manager.get_session(session_id).await
        .map_err(AppError::Session)?;
    let cli_sid = session.cli_session_id.clone();
    let session_mgr_for_sid = state.session_manager.clone();
    let change_tracker = state.change_tracker_arc();
    let pinned_context = match project_root.as_deref() {
        Some(root) => state.context_pin_manager.build_context_block(root).await,
        None => String::new(),
    };
    let editor_context = state.editor_context_manager.format_for_prompt().await;

    let handle = tokio::spawn(async move {
        eprintln!("[liminal] spawning claude for session {session_id}");
        change_tracker.begin_turn(session_id).await;

        let mut system_prompt = AiEngine::system_prompt(project_root.as_deref(), &pinned_context);
        if !editor_context.is_empty() {
            system_prompt.push_str(&editor_context);
        }
        let future = crate::core::ai_engine::streaming::stream_claude_response(
            &event_bus, session_id, &content, &system_prompt,
            &model, cli_sid.as_deref(), project_root.as_deref(), &change_tracker,
        );

        let result = tokio::time::timeout(Duration::from_secs(timeout_secs), future).await;
        let had_changes;

        match result {
            Ok(Ok(sr)) => {
                eprintln!("[liminal] claude responded ({} chars)", sr.text.len());
                if let Some(sid) = sr.cli_session_id {
                    let _ = session_mgr_for_sid.set_cli_session_id(session_id, sid).await;
                }
                let _ = session_manager
                    .append_message(session_id, Message { role: Role::Assistant, content: sr.text })
                    .await;
                let turn = change_tracker.complete_turn().await;
                had_changes = turn.map(|t| !t.changes.is_empty()).unwrap_or(false);
            }
            Ok(Err(e)) => {
                eprintln!("[liminal] claude error: {e}");
                event_bus.emit(AppEvent::Ai(AiEvent::Error { session_id, message: e.to_string() }));
                event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
                change_tracker.complete_turn().await;
                had_changes = false;
            }
            Err(_) => {
                eprintln!("[liminal] claude timed out after {timeout_secs}s");
                event_bus.emit(AppEvent::Ai(AiEvent::Error {
                    session_id, message: format!("Request timed out after {timeout_secs}s"),
                }));
                event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
                change_tracker.complete_turn().await;
                had_changes = false;
            }
        }

        // Auto-lint after turns with file changes
        if had_changes {
            if let Some(root) = &project_root {
                run_lint_silently(&event_bus, root);
            }
        }
    });

    let mut task = state.active_ai_task.lock().await;
    *task = Some(handle);
    Ok(())
}

fn run_lint_silently(event_bus: &crate::core::events::EventBus, root: &std::path::Path) {
    if let Some(cmd) = lint_runner::detect_lint_command(root) {
        event_bus.emit(AppEvent::Lint(LintEvent::Started { command: cmd.clone() }));
        if let Some(result) = lint_runner::run_lint(root) {
            event_bus.emit(AppEvent::Lint(LintEvent::Complete {
                success: result.success, output: result.output, command: result.command,
            }));
        }
    }
}

#[tauri::command]
pub async fn cancel_message(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut task = state.active_ai_task.lock().await;
    if let Some(handle) = task.take() {
        handle.abort();
        eprintln!("[liminal] cancelled active AI task");
    }
    Ok(())
}

#[tauri::command]
pub async fn check_claude_status() -> Result<bool, AppError> {
    Ok(AiEngine::check_availability())
}
