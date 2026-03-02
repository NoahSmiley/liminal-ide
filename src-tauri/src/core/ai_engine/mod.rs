pub mod streaming;
pub mod types;

const DEFAULT_SYSTEM_PROMPT: &str =
    "You are Liminal, an AI coding assistant inside a terminal IDE. \
     You help users build software by writing code, creating files, \
     and running commands. Be concise and direct.";

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

    pub fn system_prompt() -> &'static str {
        DEFAULT_SYSTEM_PROMPT
    }

    pub fn check_availability() -> bool {
        std::process::Command::new("claude")
            .arg("--version")
            .output()
            .is_ok()
    }
}
