use git2::{Diff, DiffOptions, Repository};
use serde::Serialize;

use crate::error::GitError;

#[derive(Clone, Debug, Serialize)]
pub struct GitFileDiff {
    pub path: String,
    pub patch: String,
    pub additions: usize,
    pub deletions: usize,
}

/// Get the diff between HEAD and the current working directory.
pub fn get_diff(repo: &Repository) -> Result<Vec<GitFileDiff>, GitError> {
    let head_tree = repo
        .head()
        .ok()
        .and_then(|h| h.peel_to_tree().ok());

    let mut opts = DiffOptions::new();
    opts.include_untracked(false);

    let diff = repo
        .diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut opts))
        .map_err(|e| GitError::Git(e.message().to_string()))?;

    collect_file_diffs(&diff)
}

fn collect_file_diffs(diff: &Diff<'_>) -> Result<Vec<GitFileDiff>, GitError> {
    let mut results: Vec<GitFileDiff> = Vec::new();

    let stats = diff
        .stats()
        .map_err(|e| GitError::Git(e.message().to_string()))?;
    let num_deltas = stats.files_changed();

    // Pre-populate entries from deltas
    for i in 0..diff.deltas().len() {
        let delta = diff
            .get_delta(i)
            .ok_or_else(|| GitError::Git("Missing delta".into()))?;

        let path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        results.push(GitFileDiff {
            path,
            patch: String::new(),
            additions: 0,
            deletions: 0,
        });
    }

    // Extract patches with line counts
    for i in 0..num_deltas.min(results.len()) {
        if let Ok(patch) = git2::Patch::from_diff(diff, i) {
            if let Some(mut patch) = patch {
                let (_, adds, dels) = patch.line_stats()
                    .map_err(|e| GitError::Git(e.message().to_string()))?;
                let buf = patch.to_buf()
                    .map_err(|e| GitError::Git(e.message().to_string()))?;

                results[i].patch = buf.as_str().unwrap_or("").to_string();
                results[i].additions = adds;
                results[i].deletions = dels;
            }
        }
    }

    Ok(results)
}
