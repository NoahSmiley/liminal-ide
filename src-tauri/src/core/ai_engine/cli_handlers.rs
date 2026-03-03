use std::collections::HashSet;
use uuid::Uuid;

use crate::core::change_tracker::{snapshot, ChangeTracker, ChangeType, FileChange};
use crate::core::events::{AiEvent, AppEvent, EventBus, FsEvent};

use super::types::{ContentBlock, UserContentBlock, ToolUseResult};

pub fn handle_assistant(
    event_bus: &EventBus,
    session_id: Uuid,
    content: &[ContentBlock],
    full_text: &mut String,
    last_len: &mut usize,
    emitted_thinking: &mut bool,
    seen_tools: &mut HashSet<String>,
) {
    if !*emitted_thinking && content.iter().any(|b| matches!(b, ContentBlock::Thinking { .. })) {
        *emitted_thinking = true;
        event_bus.emit(AppEvent::Ai(AiEvent::Thinking { session_id }));
    }

    let text: String = content.iter()
        .filter_map(|b| match b { ContentBlock::Text { text } => Some(text.as_str()), _ => None })
        .collect();

    if text.len() > *last_len {
        event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
            session_id, content: text[*last_len..].to_string(),
        }));
        *last_len = text.len();
    }
    *full_text = text;

    for block in content {
        if let ContentBlock::ToolUse { id, name, input } = block {
            if seen_tools.insert(id.clone()) {
                event_bus.emit(AppEvent::Ai(AiEvent::ToolUse {
                    session_id, tool_id: id.clone(), name: name.clone(), input: input.to_string(),
                }));
            }
        }
    }
}

pub async fn handle_user(
    event_bus: &EventBus,
    session_id: Uuid,
    content: &[UserContentBlock],
    result: Option<&ToolUseResult>,
    project_root: Option<&std::path::Path>,
    change_tracker: &ChangeTracker,
) {
    let tool_id = content.iter().find_map(|b| match b {
        UserContentBlock::ToolResult { tool_use_id } => Some(tool_use_id.clone()),
        _ => None,
    });

    if let Some(r) = result {
        match r {
            ToolUseResult::Create { file_path, content } => {
                let before = project_root
                    .and_then(|root| snapshot::read_before(root, file_path));
                record_and_emit_change(
                    event_bus, change_tracker, file_path, before,
                    content.clone(), ChangeType::Created,
                ).await;
                event_bus.emit(AppEvent::Fs(FsEvent::FileCreated {
                    path: file_path.clone(), content: content.clone(),
                }));
            }
            ToolUseResult::Update { file_path, content } => {
                if let Some(c) = content {
                    let before = project_root
                        .and_then(|root| snapshot::read_before(root, file_path));
                    record_and_emit_change(
                        event_bus, change_tracker, file_path, before,
                        c.clone(), ChangeType::Modified,
                    ).await;
                    event_bus.emit(AppEvent::Fs(FsEvent::FileModified {
                        path: file_path.clone(), content: c.clone(),
                    }));
                }
            }
            ToolUseResult::Other => {}
        }
    }

    if let Some(tid) = tool_id {
        event_bus.emit(AppEvent::Ai(AiEvent::ToolResult {
            session_id, tool_id: tid, output: String::new(),
        }));
    }
}

async fn record_and_emit_change(
    event_bus: &EventBus,
    change_tracker: &ChangeTracker,
    path: &str,
    before: Option<String>,
    after: String,
    change_type: ChangeType,
) {
    let change = FileChange {
        path: path.to_string(),
        change_type,
        before: before.clone(),
        after: after.clone(),
    };
    change_tracker.record_change(change).await;

    event_bus.emit(AppEvent::Fs(FsEvent::FileChangeDetected {
        path: path.to_string(), before, after, turn_id: Uuid::nil(),
    }));
}

pub async fn read_stderr(child: &mut tokio::process::Child) -> String {
    if let Some(mut stderr) = child.stderr.take() {
        let mut buf = String::new();
        use tokio::io::AsyncReadExt;
        let _ = stderr.read_to_string(&mut buf).await;
        buf.trim().to_string()
    } else {
        String::new()
    }
}
