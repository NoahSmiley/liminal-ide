pub mod diff;
pub mod log;
pub mod status;

use std::path::PathBuf;

use git2::Repository;

use crate::error::GitError;

/// Manages git operations for a project root.
pub struct GitManager {
    root: PathBuf,
}

impl GitManager {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    /// Open the git repository at the configured root path.
    pub fn open_repo(&self) -> Result<Repository, GitError> {
        Repository::open(&self.root).map_err(|e| {
            if e.code() == git2::ErrorCode::NotFound {
                GitError::NotARepo
            } else {
                GitError::Git(e.message().to_string())
            }
        })
    }
}
