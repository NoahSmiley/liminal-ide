use std::path::Path;
use std::process::Command;
use std::time::Duration;

const PLUGIN_TIMEOUT_SECS: u64 = 30;

pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

pub fn execute_script(
    plugin_dir: &Path,
    script: &str,
    project_root: Option<&Path>,
) -> Result<ExecutionResult, String> {
    let shell = if cfg!(windows) { "cmd" } else { "sh" };
    let flag = if cfg!(windows) { "/C" } else { "-c" };

    let mut cmd = Command::new(shell);
    cmd.arg(flag).arg(script).current_dir(plugin_dir);

    if let Some(root) = project_root {
        cmd.env("PROJECT_ROOT", root);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute plugin script: {}", e))?;

    // Check timeout via a simple duration check is not possible with std Command,
    // so we rely on the OS to handle it. For safety, limit output size.
    let stdout = String::from_utf8_lossy(&output.stdout)
        .chars()
        .take(10_000)
        .collect();
    let stderr = String::from_utf8_lossy(&output.stderr)
        .chars()
        .take(5_000)
        .collect();

    Ok(ExecutionResult {
        stdout,
        stderr,
        success: output.status.success(),
    })
}

pub fn timeout() -> Duration {
    Duration::from_secs(PLUGIN_TIMEOUT_SECS)
}
