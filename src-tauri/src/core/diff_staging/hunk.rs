use serde::Serialize;
use similar::{ChangeTag, TextDiff};

#[derive(Clone, Debug, Serialize)]
pub struct DiffHunk {
    pub old_start: usize,
    pub new_start: usize,
    pub lines: Vec<DiffLine>,
}

#[derive(Clone, Debug, Serialize)]
pub struct DiffLine {
    pub tag: DiffLineTag,
    pub content: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiffLineTag {
    Equal,
    Insert,
    Delete,
}

#[derive(Clone, Debug, Serialize)]
pub struct FileDiff {
    pub path: String,
    pub hunks: Vec<DiffHunk>,
    pub before: Option<String>,
    pub after: String,
}

pub fn compute_diff(before: Option<&str>, after: &str) -> Vec<DiffHunk> {
    let old = before.unwrap_or("");
    let diff = TextDiff::from_lines(old, after);
    let mut hunks = Vec::new();
    let mut current_lines: Vec<DiffLine> = Vec::new();
    let mut old_start = 1usize;
    let mut new_start = 1usize;
    let mut current_old = 0usize;
    let mut current_new = 0usize;

    for change in diff.iter_all_changes() {
        let tag = match change.tag() {
            ChangeTag::Equal => DiffLineTag::Equal,
            ChangeTag::Insert => DiffLineTag::Insert,
            ChangeTag::Delete => DiffLineTag::Delete,
        };
        if current_lines.is_empty() {
            old_start = change.old_index().unwrap_or(0) + 1;
            new_start = change.new_index().unwrap_or(0) + 1;
        }
        current_lines.push(DiffLine { tag, content: change.value().to_string() });
        match change.tag() {
            ChangeTag::Delete => current_old += 1,
            ChangeTag::Insert => current_new += 1,
            ChangeTag::Equal => { current_old += 1; current_new += 1; }
        }
    }

    if !current_lines.is_empty() {
        hunks.push(DiffHunk { old_start, new_start, lines: current_lines });
    }
    let _ = (current_old, current_new); // used for counting
    hunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_diff_identical_content_yields_all_equal() {
        let content = "line one\nline two\nline three\n";
        let hunks = compute_diff(Some(content), content);
        assert_eq!(hunks.len(), 1);
        for line in &hunks[0].lines {
            assert!(matches!(line.tag, DiffLineTag::Equal));
        }
    }

    #[test]
    fn compute_diff_none_before_yields_all_insert() {
        let after = "new line 1\nnew line 2\n";
        let hunks = compute_diff(None, after);
        assert_eq!(hunks.len(), 1);
        for line in &hunks[0].lines {
            assert!(matches!(line.tag, DiffLineTag::Insert));
        }
    }

    #[test]
    fn compute_diff_modifications_yields_mixed_hunks() {
        let before = "line one\nline two\nline three\n";
        let after = "line one\nline CHANGED\nline three\n";
        let hunks = compute_diff(Some(before), after);
        assert!(!hunks.is_empty());
        let tags: Vec<_> = hunks[0].lines.iter().map(|l| &l.tag).collect();
        let has_equal = tags.iter().any(|t| matches!(t, DiffLineTag::Equal));
        let has_insert = tags.iter().any(|t| matches!(t, DiffLineTag::Insert));
        let has_delete = tags.iter().any(|t| matches!(t, DiffLineTag::Delete));
        assert!(has_equal);
        assert!(has_insert);
        assert!(has_delete);
    }

    #[test]
    fn diff_line_tag_serializes_to_lowercase() {
        let eq = serde_json::to_string(&DiffLineTag::Equal).unwrap();
        let ins = serde_json::to_string(&DiffLineTag::Insert).unwrap();
        let del = serde_json::to_string(&DiffLineTag::Delete).unwrap();
        assert_eq!(eq, "\"equal\"");
        assert_eq!(ins, "\"insert\"");
        assert_eq!(del, "\"delete\"");
    }
}
