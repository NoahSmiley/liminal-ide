use git2::{Repository, StatusOptions};
use serde::Serialize;

use crate::error::GitError;

#[derive(Clone, Debug, Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub staged: Vec<StatusEntry>,
    pub unstaged: Vec<StatusEntry>,
    pub untracked: Vec<StatusEntry>,
}

#[derive(Clone, Debug, Serialize)]
pub struct StatusEntry {
    pub path: String,
    pub status: String,
}

/// Collect current status of the working directory.
pub fn get_status(repo: &Repository) -> Result<GitStatus, GitError> {
    let branch = current_branch(repo);
    let (ahead, behind) = ahead_behind(repo);

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| GitError::Git(e.message().to_string()))?;

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        if s.is_index_new() || s.is_index_modified() || s.is_index_deleted() {
            let label = index_status_label(s);
            staged.push(StatusEntry { path: path.clone(), status: label });
        }
        if s.is_wt_modified() || s.is_wt_deleted() {
            let label = wt_status_label(s);
            unstaged.push(StatusEntry { path: path.clone(), status: label });
        }
        if s.is_wt_new() {
            untracked.push(StatusEntry { path, status: "untracked".into() });
        }
    }

    Ok(GitStatus { branch, ahead, behind, staged, unstaged, untracked })
}

fn current_branch(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(String::from))
        .unwrap_or_else(|| "HEAD (detached)".into())
}

fn ahead_behind(repo: &Repository) -> (usize, usize) {
    let head = match repo.head().ok().and_then(|h| h.target()) {
        Some(oid) => oid,
        None => return (0, 0),
    };
    let upstream = match repo
        .head()
        .ok()
        .and_then(|h| {
            let name = h.shorthand()?.to_string();
            repo.find_branch(&name, git2::BranchType::Local).ok()
        })
        .and_then(|b| b.upstream().ok())
        .and_then(|u| u.get().target())
    {
        Some(oid) => oid,
        None => return (0, 0),
    };
    repo.graph_ahead_behind(head, upstream).unwrap_or((0, 0))
}

fn index_status_label(s: git2::Status) -> String {
    if s.is_index_new() {
        "added".into()
    } else if s.is_index_modified() {
        "modified".into()
    } else {
        "deleted".into()
    }
}

fn wt_status_label(s: git2::Status) -> String {
    if s.is_wt_modified() {
        "modified".into()
    } else {
        "deleted".into()
    }
}
