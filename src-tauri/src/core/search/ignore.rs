use std::path::Path;

const DEFAULT_IGNORES: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", ".next",
    "__pycache__", ".DS_Store", "*.pyc", "*.o", "*.so", "*.dylib",
    ".env", "*.lock", "package-lock.json",
];

pub fn should_ignore(path: &Path, gitignore_patterns: &[String]) -> bool {
    let path_str = path.to_string_lossy();
    let file_name = path.file_name().map(|n| n.to_string_lossy()).unwrap_or_default();

    for pattern in DEFAULT_IGNORES {
        if pattern.starts_with('*') {
            let suffix = &pattern[1..];
            if file_name.ends_with(suffix) {
                return true;
            }
        } else if file_name == *pattern || path_str.contains(pattern) {
            return true;
        }
    }

    for pattern in gitignore_patterns {
        let pattern = pattern.trim();
        if pattern.is_empty() || pattern.starts_with('#') {
            continue;
        }
        let clean = pattern.trim_start_matches('/').trim_end_matches('/');
        if file_name == clean || path_str.contains(clean) {
            return true;
        }
    }

    false
}

pub fn load_gitignore(project_root: &Path) -> Vec<String> {
    let gitignore_path = project_root.join(".gitignore");
    match std::fs::read_to_string(gitignore_path) {
        Ok(content) => content.lines().map(String::from).collect(),
        Err(_) => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn should_ignore_returns_true_for_default_dirs() {
        let empty: Vec<String> = vec![];
        assert!(should_ignore(&PathBuf::from("project/node_modules"), &empty));
        assert!(should_ignore(&PathBuf::from("project/.git"), &empty));
        assert!(should_ignore(&PathBuf::from("project/target"), &empty));
    }

    #[test]
    fn should_ignore_returns_true_for_wildcard_patterns() {
        let empty: Vec<String> = vec![];
        assert!(should_ignore(&PathBuf::from("src/file.pyc"), &empty));
        assert!(should_ignore(&PathBuf::from("build/output.o"), &empty));
    }

    #[test]
    fn should_ignore_returns_false_for_normal_files() {
        let empty: Vec<String> = vec![];
        assert!(!should_ignore(&PathBuf::from("src/main.rs"), &empty));
        assert!(!should_ignore(&PathBuf::from("README.md"), &empty));
        assert!(!should_ignore(&PathBuf::from("src/lib.ts"), &empty));
    }

    #[test]
    fn gitignore_patterns_respected() {
        let patterns = vec!["custom_dir".to_string(), "*.log".to_string()];
        assert!(should_ignore(&PathBuf::from("project/custom_dir"), &patterns));
    }

    #[test]
    fn comment_and_empty_lines_in_gitignore_skipped() {
        let patterns = vec![
            "# this is a comment".to_string(),
            "".to_string(),
            "  ".to_string(),
            "real_pattern".to_string(),
        ];
        // Comments and empty lines should not cause false positives
        assert!(!should_ignore(&PathBuf::from("src/safe.rs"), &patterns));
        assert!(should_ignore(
            &PathBuf::from("project/real_pattern"),
            &patterns,
        ));
    }

    #[test]
    fn load_gitignore_returns_empty_for_missing_file() {
        let tmp = tempfile::tempdir().unwrap();
        let result = load_gitignore(tmp.path());
        assert!(result.is_empty());
    }

    #[test]
    fn load_gitignore_reads_patterns() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::write(
            tmp.path().join(".gitignore"),
            "dist\n*.log\n# comment\n",
        ).unwrap();
        let result = load_gitignore(tmp.path());
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], "dist");
        assert_eq!(result[2], "# comment");
    }
}
