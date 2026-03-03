mod cli;
mod cli_handlers;
pub mod streaming;
pub mod tool_executor;
pub mod types;

const BASE_SYSTEM_PROMPT: &str =
    "You are Liminal, an AI coding assistant inside a terminal IDE. \
     You help users build software by writing code, creating files, \
     and running commands. Be concise and direct. Never use emojis. \
     You have these tools: Write(file_path, content), Read(file_path), \
     Edit(file_path, old_string, new_string), MultiEdit(file_path, edits), \
     Bash(command), Glob(pattern), Grep(pattern, path), LS(path). \
     Use them to help the user. \
     All file paths are relative to the project root. \
     Bash commands run with the project root as the working directory.";

pub struct AiEngine {
    model: String,
}

impl AiEngine {
    pub fn new(model: String) -> Self {
        Self { model }
    }

    pub fn model(&self) -> &str {
        &self.model
    }

    pub fn system_prompt(project_root: Option<&std::path::Path>, pinned_context: &str) -> String {
        let base = match project_root {
            Some(root) => format!(
                "{} The project root is: {}",
                BASE_SYSTEM_PROMPT,
                root.display()
            ),
            None => BASE_SYSTEM_PROMPT.to_string(),
        };
        if pinned_context.is_empty() {
            base
        } else {
            format!("{base}{pinned_context}")
        }
    }

    pub fn check_availability() -> bool {
        std::process::Command::new("claude")
            .arg("--version")
            .output()
            .is_ok()
    }
}
