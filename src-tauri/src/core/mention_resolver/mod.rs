#[cfg(test)]
mod tests;

use std::path::Path;

use serde::Serialize;

use crate::error::FsError;

#[derive(Clone, Debug, Serialize)]
pub struct ResolvedMention {
    pub pattern: String,
    pub path: String,
    pub content: String,
}

/// Parses `@filename` patterns in a prompt and resolves them to file contents.
/// Returns the enriched prompt with file content appended, plus the list of mentions.
pub fn resolve_mentions(
    prompt: &str,
    project_root: &Path,
) -> Result<(String, Vec<ResolvedMention>), FsError> {
    let mut mentions = Vec::new();
    let words: Vec<&str> = prompt.split_whitespace().collect();

    for word in &words {
        if !word.starts_with('@') || word.len() < 2 {
            continue;
        }
        let pattern = &word[1..];
        if let Some(resolved) = find_file(project_root, pattern)? {
            mentions.push(resolved);
        }
    }

    if mentions.is_empty() {
        return Ok((prompt.to_string(), mentions));
    }

    let mut enriched = prompt.to_string();
    enriched.push_str("\n\n<mentioned-files>\n");
    for m in &mentions {
        enriched.push_str(&format!("--- {} ---\n{}\n", m.path, m.content));
    }
    enriched.push_str("</mentioned-files>");

    Ok((enriched, mentions))
}

fn find_file(root: &Path, pattern: &str) -> Result<Option<ResolvedMention>, FsError> {
    let direct = root.join(pattern);
    if direct.is_file() {
        let content = std::fs::read_to_string(&direct)
            .map_err(|_| FsError::NotFound(pattern.to_string()))?;
        return Ok(Some(ResolvedMention {
            pattern: format!("@{}", pattern),
            path: pattern.to_string(),
            content,
        }));
    }
    // Try fuzzy: search for files ending with the pattern
    if let Some(found) = find_matching_file(root, root, pattern)? {
        return Ok(Some(found));
    }
    Ok(None)
}

fn find_matching_file(
    root: &Path,
    dir: &Path,
    pattern: &str,
) -> Result<Option<ResolvedMention>, FsError> {
    let entries = std::fs::read_dir(dir).map_err(FsError::Io)?;
    for entry in entries {
        let entry = entry.map_err(FsError::Io)?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }
        if path.is_file() && name.contains(pattern) {
            let content = std::fs::read_to_string(&path)
                .map_err(|_| FsError::NotFound(pattern.to_string()))?;
            let rel = path.strip_prefix(root).unwrap_or(&path);
            return Ok(Some(ResolvedMention {
                pattern: format!("@{}", pattern),
                path: rel.display().to_string(),
                content,
            }));
        }
        if path.is_dir() {
            if let Some(found) = find_matching_file(root, &path, pattern)? {
                return Ok(Some(found));
            }
        }
    }
    Ok(None)
}
