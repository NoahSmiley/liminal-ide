pub mod fs_tools;
pub mod shell_tools;

use std::path::Path;

use crate::core::events::FsEvent;
use crate::core::filesystem::FileSystemManager;

pub struct ToolOutcome {
    pub output: String,
    pub is_error: bool,
    pub fs_events: Vec<FsEvent>,
}

pub struct ToolExecutor {
    fs_manager: FileSystemManager,
}

impl ToolExecutor {
    pub fn new(fs_manager: FileSystemManager) -> Self {
        Self { fs_manager }
    }

    pub async fn execute(
        &self,
        project_root: &Path,
        tool_name: &str,
        input: &serde_json::Value,
    ) -> ToolOutcome {
        match tool_name {
            "Write" | "create_file" => fs_tools::handle_write(&self.fs_manager, project_root, input),
            "Read" | "read_file" => fs_tools::handle_read(&self.fs_manager, project_root, input),
            "Edit" | "replace_in_file" => fs_tools::handle_edit(&self.fs_manager, project_root, input),
            "MultiEdit" => fs_tools::handle_multi_edit(&self.fs_manager, project_root, input),
            "LS" | "list_directory" => fs_tools::handle_ls(&self.fs_manager, project_root, input),
            "Bash" | "execute_command" => shell_tools::handle_bash(project_root, input).await,
            "Glob" => shell_tools::handle_glob(project_root, input).await,
            "Grep" => shell_tools::handle_grep(project_root, input).await,
            _ => error_outcome(&format!("Unknown tool: {tool_name}")),
        }
    }
}

pub fn input_str(input: &serde_json::Value, key: &str) -> Option<String> {
    input.get(key).and_then(|v| v.as_str()).map(String::from)
}

pub fn error_outcome(msg: &str) -> ToolOutcome {
    ToolOutcome {
        output: msg.to_string(),
        is_error: true,
        fs_events: vec![],
    }
}
