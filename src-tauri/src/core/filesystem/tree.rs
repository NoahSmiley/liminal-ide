use std::path::Path;

use serde::Serialize;

use crate::error::FsError;

const IGNORED: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    ".DS_Store",
    "__pycache__",
    ".next",
    "dist",
    ".turbo",
];

#[derive(Clone, Debug, Serialize)]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<TreeNode>>,
}

pub fn build_tree(root: &Path, depth: usize) -> Result<Vec<TreeNode>, FsError> {
    let mut nodes = Vec::new();
    let read_dir = std::fs::read_dir(root).map_err(FsError::Io)?;

    for entry in read_dir {
        let entry = entry.map_err(FsError::Io)?;
        let name = entry.file_name().to_string_lossy().to_string();

        if IGNORED.contains(&name.as_str()) {
            continue;
        }

        let metadata = entry.metadata().map_err(FsError::Io)?;
        let is_dir = metadata.is_dir();
        let path_str = entry.path().display().to_string();

        let children = if is_dir && depth > 0 {
            Some(build_tree(&entry.path(), depth - 1)?)
        } else if is_dir {
            None // not yet expanded
        } else {
            None
        };

        nodes.push(TreeNode {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }

    nodes.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(nodes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn test_dir(name: &str) -> std::path::PathBuf {
        let dir = env::temp_dir().join(format!("liminal-tree-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    #[test]
    fn lists_files_and_dirs() {
        let root = test_dir("basic");
        std::fs::create_dir(root.join("src")).unwrap();
        std::fs::write(root.join("main.rs"), "fn main() {}").unwrap();
        let nodes = build_tree(&root, 1).unwrap();
        assert_eq!(nodes.len(), 2);
        assert!(nodes[0].is_dir); // dirs first
        assert!(!nodes[1].is_dir);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ignores_git_and_node_modules() {
        let root = test_dir("ignore");
        std::fs::create_dir(root.join(".git")).unwrap();
        std::fs::create_dir(root.join("node_modules")).unwrap();
        std::fs::write(root.join("app.ts"), "export {}").unwrap();
        let nodes = build_tree(&root, 1).unwrap();
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0].name, "app.ts");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn respects_depth_limit() {
        let root = test_dir("depth");
        std::fs::create_dir_all(root.join("a/b")).unwrap();
        std::fs::write(root.join("a/b/deep.txt"), "x").unwrap();
        let nodes = build_tree(&root, 0).unwrap();
        assert_eq!(nodes.len(), 1);
        assert!(nodes[0].children.is_none()); // depth=0, not expanded
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn sorts_dirs_before_files() {
        let root = test_dir("sort");
        std::fs::write(root.join("zebra.txt"), "").unwrap();
        std::fs::create_dir(root.join("alpha")).unwrap();
        std::fs::write(root.join("beta.txt"), "").unwrap();
        let nodes = build_tree(&root, 0).unwrap();
        assert!(nodes[0].is_dir);
        assert_eq!(nodes[0].name, "alpha");
        let _ = std::fs::remove_dir_all(&root);
    }
}
