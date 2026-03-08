use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("AI error: {0}")]
    Ai(#[from] AiError),

    #[error("File system error: {0}")]
    FileSystem(#[from] FsError),

    #[error("Git error: {0}")]
    Git(#[from] GitError),

    #[error("Terminal error: {0}")]
    Terminal(#[from] TermError),

    #[error("Session error: {0}")]
    Session(#[from] SessionError),

    #[error("Project error: {0}")]
    Project(#[from] ProjectError),

    #[error("LSP error: {0}")]
    Lsp(#[from] LspError),

    #[error("Change error: {0}")]
    Change(#[from] ChangeError),

    #[error("Settings error: {0}")]
    Settings(#[from] SettingsError),

    #[error("Search error: {0}")]
    Search(#[from] SearchError),

    #[error("Debug error: {0}")]
    Debug(String),

    #[error("Relay error: {0}")]
    Relay(String),
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

    #[error("Project not found: {0}")]
    NotFound(String),

    #[error("Project already open: {0}")]
    AlreadyOpen(String),

    #[error("Invalid config: {0}")]
    ConfigInvalid(String),
}

#[derive(Error, Debug)]
pub enum LspError {
    #[error("Failed to spawn LSP server: {0}")]
    SpawnFailed(String),

    #[error("Server not found: {0}")]
    ServerNotFound(String),

    #[error("LSP server exited unexpectedly")]
    ServerExited,

    #[error("Protocol error: {0}")]
    ProtocolError(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Request failed: {0}")]
    RequestFailed(String),
}

#[derive(Error, Debug)]
pub enum SearchError {
    #[error("Invalid search pattern: {0}")]
    InvalidPattern(String),

    #[error("Search IO error: {0}")]
    IoError(String),
}

#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("Failed to load settings: {0}")]
    LoadFailed(String),

    #[error("Failed to save settings: {0}")]
    SaveFailed(String),
}

#[derive(Error, Debug)]
pub enum ChangeError {
    #[error("Turn not found: {0}")]
    TurnNotFound(String),

    #[error("Revert failed: {0}")]
    RevertFailed(String),
}

#[derive(Error, Debug)]
pub enum GitError {
    #[error("Not a git repository")]
    NotARepo,

    #[error("Git error: {0}")]
    Git(String),
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
