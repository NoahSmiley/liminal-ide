use std::path::Path;
use std::process::Command;

use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct LintResult {
    pub success: bool,
    pub output: String,
    pub command: String,
}

/// Detect the appropriate lint/typecheck command based on project markers.
pub fn detect_lint_command(project_root: &Path) -> Option<String> {
    if project_root.join("tsconfig.json").exists() {
        return Some("npx tsc --noEmit".to_string());
    }
    if project_root.join("package.json").exists() {
        if project_root.join("node_modules/.bin/eslint").exists() {
            return Some("npx eslint .".to_string());
        }
    }
    if project_root.join("Cargo.toml").exists() {
        return Some("cargo check".to_string());
    }
    if project_root.join("pyproject.toml").exists() {
        return Some("python -m mypy .".to_string());
    }
    if project_root.join("go.mod").exists() {
        return Some("go vet ./...".to_string());
    }
    None
}

/// Run the lint command and return the result.
pub fn run_lint(project_root: &Path) -> Option<LintResult> {
    let command = detect_lint_command(project_root)?;

    let parts: Vec<&str> = command.split_whitespace().collect();
    let (program, args) = parts.split_first()?;

    let output = Command::new(program)
        .args(args)
        .current_dir(project_root)
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{stdout}\n{stderr}")
    };

    Some(LintResult {
        success: output.status.success(),
        output: combined.trim().to_string(),
        command,
    })
}
