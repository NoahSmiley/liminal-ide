use git2::Repository;
use serde::Serialize;

use crate::error::GitError;

#[derive(Clone, Debug, Serialize)]
pub struct GitCommit {
    pub id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
}

/// Walk the commit history starting from HEAD, returning up to `limit` entries.
pub fn get_log(repo: &Repository, limit: usize) -> Result<Vec<GitCommit>, GitError> {
    let head = repo
        .head()
        .map_err(|e| GitError::Git(e.message().to_string()))?;

    let head_oid = head
        .target()
        .ok_or_else(|| GitError::Git("HEAD has no target".into()))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| GitError::Git(e.message().to_string()))?;

    revwalk
        .push(head_oid)
        .map_err(|e| GitError::Git(e.message().to_string()))?;

    let mut commits = Vec::with_capacity(limit);

    for oid_result in revwalk {
        if commits.len() >= limit {
            break;
        }
        let oid = oid_result.map_err(|e| GitError::Git(e.message().to_string()))?;
        let commit = repo
            .find_commit(oid)
            .map_err(|e| GitError::Git(e.message().to_string()))?;

        commits.push(GitCommit {
            id: oid.to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("unknown").to_string(),
            time: commit.time().seconds(),
        });
    }

    Ok(commits)
}
