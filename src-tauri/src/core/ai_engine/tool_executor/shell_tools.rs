use std::path::Path;
use std::time::Duration;

use super::{error_outcome, input_str, ToolOutcome};

const BASH_TIMEOUT_SECS: u64 = 60;

pub async fn handle_bash(project_root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let Some(command) = input_str(input, "command") else {
        return error_outcome("Bash requires 'command'");
    };

    let future = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .current_dir(project_root)
        .output();

    let result = tokio::time::timeout(Duration::from_secs(BASH_TIMEOUT_SECS), future).await;

    match result {
        Ok(Ok(output)) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let combined = if stderr.is_empty() {
                stdout.to_string()
            } else {
                format!("{stdout}{stderr}")
            };
            ToolOutcome {
                output: combined,
                is_error: !output.status.success(),
                fs_events: vec![],
            }
        }
        Ok(Err(e)) => error_outcome(&format!("Failed to run command: {e}")),
        Err(_) => ToolOutcome {
            output: format!("Command timed out after {BASH_TIMEOUT_SECS}s: {command}"),
            is_error: true,
            fs_events: vec![],
        },
    }
}

pub async fn handle_glob(project_root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let Some(pattern) = input_str(input, "pattern") else {
        return error_outcome("Glob requires 'pattern'");
    };

    let root = project_root.display();
    let cmd = format!("find {root} -name '{pattern}' -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/target/*' 2>/dev/null | head -200");

    let result = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .await;

    match result {
        Ok(output) => ToolOutcome {
            output: String::from_utf8_lossy(&output.stdout).to_string(),
            is_error: false,
            fs_events: vec![],
        },
        Err(e) => error_outcome(&format!("Glob failed: {e}")),
    }
}

pub async fn handle_grep(project_root: &Path, input: &serde_json::Value) -> ToolOutcome {
    let Some(pattern) = input_str(input, "pattern") else {
        return error_outcome("Grep requires 'pattern'");
    };

    let path = input_str(input, "path")
        .map(|p| project_root.join(p).display().to_string())
        .unwrap_or_else(|| project_root.display().to_string());

    let cmd = format!(
        "grep -rn --include='*.rs' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.py' --include='*.toml' --include='*.json' --include='*.md' '{pattern}' {path} 2>/dev/null | head -100"
    );

    let result = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .await;

    match result {
        Ok(output) => ToolOutcome {
            output: String::from_utf8_lossy(&output.stdout).to_string(),
            is_error: false,
            fs_events: vec![],
        },
        Err(e) => error_outcome(&format!("Grep failed: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn test_dir(name: &str) -> std::path::PathBuf {
        let dir = env::temp_dir().join(format!("liminal-shell-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    #[tokio::test]
    async fn bash_runs_command() {
        let root = test_dir("bash");
        let input = serde_json::json!({ "command": "echo hello" });
        let out = handle_bash(&root, &input).await;
        assert!(!out.is_error);
        assert!(out.output.contains("hello"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[tokio::test]
    async fn bash_captures_error() {
        let root = test_dir("bash-err");
        let input = serde_json::json!({ "command": "false" });
        let out = handle_bash(&root, &input).await;
        assert!(out.is_error);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[tokio::test]
    async fn glob_finds_files() {
        let root = test_dir("glob");
        std::fs::write(root.join("test.rs"), "fn main() {}").unwrap();
        let input = serde_json::json!({ "pattern": "*.rs" });
        let out = handle_glob(&root, &input).await;
        assert!(!out.is_error);
        assert!(out.output.contains("test.rs"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[tokio::test]
    async fn grep_finds_pattern() {
        let root = test_dir("grep");
        std::fs::write(root.join("search.rs"), "fn hello_world() {}").unwrap();
        let input = serde_json::json!({ "pattern": "hello_world" });
        let out = handle_grep(&root, &input).await;
        assert!(!out.is_error);
        assert!(out.output.contains("hello_world"));
        let _ = std::fs::remove_dir_all(&root);
    }
}
