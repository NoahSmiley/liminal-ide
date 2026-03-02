use std::path::PathBuf;

pub struct AppConfig {
    pub claude_model: String,
    pub claude_timeout_seconds: u64,
    pub data_dir: PathBuf,
}

impl Default for AppConfig {
    fn default() -> Self {
        let data_dir = dirs_next::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("liminal");

        Self {
            claude_model: "sonnet".to_string(),
            claude_timeout_seconds: 120,
            data_dir,
        }
    }
}
