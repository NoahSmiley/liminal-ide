use std::collections::HashSet;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use uuid::Uuid;

use crate::core::change_tracker::ChangeTracker;
use crate::core::events::{AiEvent, AppEvent, EventBus};
use crate::error::AiError;

use super::cli_handlers::{handle_assistant, handle_user, read_stderr};
use super::types::{ClaudeStreamEvent, ToolUseResult};

pub struct SessionResult {
    pub text: String,
    pub cli_session_id: Option<String>,
}

/// Streams an entire Claude CLI session, emitting events in real-time.
pub async fn stream_session(
    event_bus: &EventBus,
    session_id: Uuid,
    prompt: &str,
    system_prompt: &str,
    model: &str,
    resume_id: Option<&str>,
    project_root: Option<&std::path::Path>,
    change_tracker: &ChangeTracker,
) -> Result<SessionResult, AiError> {
    let mut args = vec![
        "-p", "--output-format", "stream-json",
        "--model", model,
        "--verbose",
        "--dangerously-skip-permissions",
        "--disable-slash-commands",
        "--setting-sources", "",
        "--tools", "Write,Read,Edit,MultiEdit,Bash,Glob,Grep,LS",
        "--system-prompt", system_prompt,
    ];

    let resume_id_owned: String;
    if let Some(rid) = resume_id {
        resume_id_owned = rid.to_string();
        args.push("--resume");
        args.push(&resume_id_owned);
    }
    args.push(prompt);

    let mut cmd = Command::new("claude");
    cmd.args(&args)
        .env_remove("CLAUDECODE")
        .env("DISABLE_AUTOUPDATER", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(root) = project_root {
        cmd.current_dir(root);
    }

    let mut child = cmd.spawn().map_err(|_| AiError::CliNotFound)?;
    let stdout = child
        .stdout
        .take()
        .ok_or(AiError::ProcessCrashed("No stdout".into()))?;

    let result = process_stream(
        event_bus, session_id, stdout, project_root, change_tracker,
    ).await;

    let status = child.wait().await
        .map_err(|e| AiError::ProcessCrashed(e.to_string()))?;

    let (full_text, cli_session_id) = result?;

    if !status.success() && full_text.is_empty() {
        let detail = read_stderr(&mut child).await;
        return Err(AiError::ProcessCrashed(
            if detail.is_empty() { format!("exit {status}") } else { detail },
        ));
    }

    event_bus.emit(AppEvent::Ai(AiEvent::TurnComplete { session_id }));
    Ok(SessionResult { text: full_text, cli_session_id })
}

async fn process_stream(
    event_bus: &EventBus,
    session_id: Uuid,
    stdout: tokio::process::ChildStdout,
    project_root: Option<&std::path::Path>,
    change_tracker: &ChangeTracker,
) -> Result<(String, Option<String>), AiError> {
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    let mut full_text = String::new();
    let mut last_len: usize = 0;
    let mut emitted_thinking = false;
    let mut seen_tools: HashSet<String> = HashSet::new();
    let mut cli_session_id: Option<String> = None;

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() { continue; }

        match serde_json::from_str::<ClaudeStreamEvent>(&line) {
            Ok(ClaudeStreamEvent::Assistant { message }) => {
                handle_assistant(
                    event_bus, session_id, &message.content,
                    &mut full_text, &mut last_len,
                    &mut emitted_thinking, &mut seen_tools,
                );
            }
            Ok(ClaudeStreamEvent::User { message, tool_use_result }) => {
                let parsed = tool_use_result.as_ref()
                    .and_then(|v| serde_json::from_value::<ToolUseResult>(v.clone()).ok());
                handle_user(
                    event_bus, session_id, &message.content,
                    parsed.as_ref(), project_root, change_tracker,
                ).await;
                last_len = 0;
            }
            Ok(ClaudeStreamEvent::Result {
                result, is_error, session_id: sid,
            }) => {
                if let Some(s) = sid { cli_session_id = Some(s); }
                if is_error {
                    event_bus.emit(AppEvent::Ai(AiEvent::Error {
                        session_id, message: result.clone(),
                    }));
                }
                if full_text.is_empty() && !result.is_empty() && !is_error {
                    full_text = result.clone();
                    event_bus.emit(AppEvent::Ai(AiEvent::TextDelta {
                        session_id, content: result,
                    }));
                }
            }
            Ok(_) => {}
            Err(e) => { eprintln!("[liminal] parse: {e}"); }
        }
    }

    Ok((full_text, cli_session_id))
}
