use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("AI error: {0}")]
    Ai(#[from] AiError),

    #[error("File system error: {0}")]
    FileSystem(#[from] FsError),

    #[error("Terminal error: {0}")]
    Terminal(#[from] TermError),

    #[error("Session error: {0}")]
    Session(#[from] SessionError),

    #[error("Project error: {0}")]
    Project(#[from] ProjectError),
}

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Claude CLI not found — install with: npm i -g @anthropic-ai/claude-code")]
    CliNotFound,

    #[error("Claude CLI not authenticated — run: claude login")]
    NotAuthenticated,

    #[error("Claude process crashed: {0}")]
    ProcessCrashed(String),

    #[error("Stream corrupted: {0}")]
    StreamCorrupted(String),

    #[error("Rate limited — retry after {seconds}s")]
    RateLimited { seconds: u64 },

    #[error("Request timed out after {seconds}s")]
    Timeout { seconds: u64 },
}

#[derive(Error, Debug)]
pub enum FsError {
    #[error("File not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Path outside project directory: {0}")]
    OutsideProject(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Error, Debug)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    NotFound(String),

    #[error("Corrupted session history: {0}")]
    CorruptedHistory(String),

    #[error("Storage failed: {0}")]
    StorageFailed(String),
}

#[derive(Error, Debug)]
pub enum TermError {
    #[error("Failed to spawn shell: {0}")]
    SpawnFailed(String),

    #[error("Process hung — no output for {seconds}s")]
    ProcessHung { seconds: u64 },

    #[error("PTY unavailable: {0}")]
    PtyUnavailable(String),
}

#[derive(Error, Debug)]
pub enum ProjectError {
    #[error("Invalid project path: {0}")]
    InvalidPath(String),

    #[error("Project already open: {0}")]
    AlreadyOpen(String),

    #[error("Invalid config: {0}")]
    ConfigInvalid(String),
}

// Tauri commands require Serialize on errors
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
