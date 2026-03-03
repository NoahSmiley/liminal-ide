use tauri::State;
use uuid::Uuid;

use crate::core::ai_engine::AiEngine;
use crate::core::events::{AiEvent, AppEvent};
use crate::core::session::{Message, Role};
use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn summarize_project(
    state: State<'_, AppState>,
    session_id: Uuid,
) -> Result<(), AppError> {
    let project = state.project_manager.get_active().await
        .ok_or_else(|| AppError::Project(crate::error::ProjectError::InvalidPath("no active project".into())))?;

    let tree_output = crate::core::filesystem::tree::build_tree(&project.root_path, 3)
        .map(|nodes| format_tree(&nodes))
        .unwrap_or_else(|_| "could not read project tree".to_string());

    let prompt = format!(
        "Summarize this project briefly. Here is the file tree:\n```\n{}\n```\n\
         Describe what this project does, the tech stack, and key entry points. Be concise.",
        tree_output,
    );

    state.session_manager
        .append_message(session_id, Message { role: Role::User, content: prompt.clone() })
        .await
        .map_err(AppError::Session)?;

    let event_bus = state.event_bus.clone();
    let session_manager = state.session_manager.clone();
    let model = state.ai_engine.model().to_string();
    let root = project.root_path.clone();
    let timeout_secs = state.config.claude_timeout_seconds;
    let cli_sid = state.cli_session_id.lock().await.clone();
    let cli_sid_mutex = state.cli_session_id.clone();
    let change_tracker = state.change_tracker_arc();
    let pinned_context = state.context_pin_manager.build_context_block(&root).await;

    let handle = tokio::spawn(async move {
        let system_prompt = AiEngine::system_prompt(Some(&root), &pinned_context);
        let future = crate::core::ai_engine::streaming::stream_claude_response(
            &event_bus, session_id, &prompt, &system_prompt, &model,
            cli_sid.as_deref(), Some(&root), &change_tracker,
        );

        match tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs), future,
        ).await {
            Ok(Ok(sr)) => {
                if let Some(sid) = sr.cli_session_id {
                    *cli_sid_mutex.lock().await = Some(sid);
                }
                let _ = session_manager.append_message(
                    session_id, Message { role: Role::Assistant, content: sr.text },
                ).await;
            }
            Ok(Err(e)) => {
                event_bus.emit(AppEvent::Ai(AiEvent::Error { session_id, message: e.to_string() }));
                event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
            }
            Err(_) => {
                event_bus.emit(AppEvent::Ai(AiEvent::Error {
                    session_id, message: "summary timed out".into(),
                }));
                event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
            }
        }
    });

    let mut task = state.active_ai_task.lock().await;
    *task = Some(handle);
    Ok(())
}

fn format_tree(nodes: &[crate::core::filesystem::tree::TreeNode]) -> String {
    let mut out = String::new();
    for node in nodes {
        format_node(&mut out, node, 0);
    }
    out
}

fn format_node(out: &mut String, node: &crate::core::filesystem::tree::TreeNode, depth: usize) {
    let indent = "  ".repeat(depth);
    let suffix = if node.is_dir { "/" } else { "" };
    out.push_str(&format!("{indent}{}{suffix}\n", node.name));
    if let Some(children) = &node.children {
        for child in children {
            format_node(out, child, depth + 1);
        }
    }
}
