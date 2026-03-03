use std::path::Path;
use std::process::Command;

/// An LSP server that can be spawned for a project.
pub struct DetectedServer {
    pub name: String,
    pub cmd: String,
    pub args: Vec<String>,
}

/// Detect available LSP servers based on project marker files.
pub fn detect_servers(project_root: &Path) -> Vec<DetectedServer> {
    let mut servers = Vec::new();

    if has_marker(project_root, "Cargo.toml") && is_available("rust-analyzer") {
        servers.push(DetectedServer {
            name: "rust-analyzer".into(),
            cmd: "rust-analyzer".into(),
            args: vec![],
        });
    }

    let has_ts = has_marker(project_root, "tsconfig.json");
    let has_pkg = has_marker(project_root, "package.json");
    if (has_ts || has_pkg) && is_available("typescript-language-server") {
        servers.push(DetectedServer {
            name: "typescript-language-server".into(),
            cmd: "typescript-language-server".into(),
            args: vec!["--stdio".into()],
        });
    }

    let has_pyproject = has_marker(project_root, "pyproject.toml");
    let has_requirements = has_marker(project_root, "requirements.txt");
    if (has_pyproject || has_requirements) && is_available("pyright-langserver") {
        servers.push(DetectedServer {
            name: "pyright".into(),
            cmd: "pyright-langserver".into(),
            args: vec!["--stdio".into()],
        });
    }

    servers
}

fn has_marker(root: &Path, filename: &str) -> bool {
    root.join(filename).exists()
}

fn is_available(cmd: &str) -> bool {
    Command::new(cmd).arg("--version").output().is_ok()
}
