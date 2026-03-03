pub mod ignore;
#[cfg(test)]
mod tests;

use serde::Serialize;
use std::path::Path;

use crate::error::SearchError;
use ignore::{load_gitignore, should_ignore};

#[derive(Clone, Debug, Serialize)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_content: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct SearchResult {
    pub path: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Clone, Debug)]
pub struct SearchOptions {
    pub case_sensitive: bool,
    pub regex: bool,
    pub max_results: usize,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self { case_sensitive: false, regex: false, max_results: 500 }
    }
}

pub fn search_project(
    root: &Path,
    query: &str,
    options: &SearchOptions,
) -> Result<Vec<SearchResult>, SearchError> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let gitignore = load_gitignore(root);
    let pattern = build_pattern(query, options)?;
    let mut results = Vec::new();
    let mut total_matches = 0;
    walk_dir(root, root, &gitignore, &pattern, options, &mut results, &mut total_matches)?;
    Ok(results)
}

fn build_pattern(query: &str, options: &SearchOptions) -> Result<regex::Regex, SearchError> {
    let pattern_str = if options.regex {
        query.to_string()
    } else {
        regex::escape(query)
    };
    let pattern_str = if options.case_sensitive {
        pattern_str
    } else {
        format!("(?i){}", pattern_str)
    };
    regex::Regex::new(&pattern_str).map_err(|e| SearchError::InvalidPattern(e.to_string()))
}

fn walk_dir(
    root: &Path,
    dir: &Path,
    gitignore: &[String],
    pattern: &regex::Regex,
    options: &SearchOptions,
    results: &mut Vec<SearchResult>,
    total_matches: &mut usize,
) -> Result<(), SearchError> {
    let entries = std::fs::read_dir(dir).map_err(|e| SearchError::IoError(e.to_string()))?;
    for entry in entries {
        if *total_matches >= options.max_results { break; }
        let entry = entry.map_err(|e| SearchError::IoError(e.to_string()))?;
        let path = entry.path();
        if should_ignore(&path, gitignore) { continue; }
        if path.is_dir() {
            walk_dir(root, &path, gitignore, pattern, options, results, total_matches)?;
        } else if path.is_file() {
            search_file(root, &path, pattern, options, results, total_matches)?;
        }
    }
    Ok(())
}

fn search_file(
    root: &Path,
    path: &Path,
    pattern: &regex::Regex,
    options: &SearchOptions,
    results: &mut Vec<SearchResult>,
    total_matches: &mut usize,
) -> Result<(), SearchError> {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return Ok(()), // skip binary or unreadable files
    };
    let mut matches = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        if *total_matches >= options.max_results { break; }
        if pattern.is_match(line) {
            matches.push(SearchMatch { line_number: idx + 1, line_content: line.to_string() });
            *total_matches += 1;
        }
    }
    if !matches.is_empty() {
        let rel_path = path.strip_prefix(root).unwrap_or(path);
        results.push(SearchResult { path: rel_path.display().to_string(), matches });
    }
    Ok(())
}
