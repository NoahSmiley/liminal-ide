use serde::Serialize;
use std::path::{Path, PathBuf};

use crate::error::FsError;

#[derive(Clone, Debug, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

pub struct FileSystemManager;

impl FileSystemManager {
    pub fn new() -> Self {
        Self
    }

    pub fn validate_path(
        &self,
        project_root: &Path,
        target: &Path,
    ) -> Result<PathBuf, FsError> {
        let canonical_root = project_root.canonicalize().map_err(FsError::Io)?;

        let absolute = if target.is_absolute() {
            target.to_path_buf()
        } else {
            canonical_root.join(target)
        };

        // For existing paths, canonicalize fully. For new files,
        // canonicalize the parent and append the filename.
        let canonical_target = match absolute.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                if let Some(parent) = absolute.parent() {
                    let canon_parent = parent
                        .canonicalize()
                        .unwrap_or_else(|_| parent.to_path_buf());
                    match absolute.file_name() {
                        Some(name) => canon_parent.join(name),
                        None => canon_parent,
                    }
                } else {
                    absolute.clone()
                }
            }
        };

        if !canonical_target.starts_with(&canonical_root) {
            return Err(FsError::OutsideProject(target.display().to_string()));
        }

        Ok(canonical_target)
    }

    pub fn read_file(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<FileContent, FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        let content = std::fs::read_to_string(&safe_path)
            .map_err(|_| FsError::NotFound(path.display().to_string()))?;
        Ok(FileContent {
            path: path.display().to_string(),
            content,
        })
    }

    pub fn write_file(
        &self,
        project_root: &Path,
        path: &Path,
        content: &str,
    ) -> Result<(), FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        if let Some(parent) = safe_path.parent() {
            std::fs::create_dir_all(parent).map_err(FsError::Io)?;
        }
        std::fs::write(&safe_path, content).map_err(FsError::Io)?;
        Ok(())
    }

    pub fn delete_file(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<(), FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        std::fs::remove_file(&safe_path)
            .map_err(|_| FsError::NotFound(path.display().to_string()))?;
        Ok(())
    }

    pub fn list_directory(
        &self,
        project_root: &Path,
        path: &Path,
    ) -> Result<Vec<DirEntry>, FsError> {
        let safe_path = self.validate_path(project_root, path)?;
        let mut entries = Vec::new();
        let read_dir = std::fs::read_dir(&safe_path).map_err(FsError::Io)?;

        for entry in read_dir {
            let entry = entry.map_err(FsError::Io)?;
            let metadata = entry.metadata().map_err(FsError::Io)?;
            entries.push(DirEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().display().to_string(),
                is_dir: metadata.is_dir(),
            });
        }

        entries.sort_by(|a, b| {
            b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
        });
        Ok(entries)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn setup_test_dir(suffix: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("liminal-fs-test-{}", suffix));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    #[test]
    fn write_and_read_file() {
        let root = setup_test_dir("rw");
        let fs = FileSystemManager::new();
        fs.write_file(&root, Path::new("test.txt"), "hello")
            .expect("write failed");
        let content = fs
            .read_file(&root, Path::new("test.txt"))
            .expect("read failed");
        assert_eq!(content.content, "hello");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn rejects_path_outside_project() {
        let root = setup_test_dir("outside");
        let fs = FileSystemManager::new();
        let result = fs.read_file(&root, Path::new("C:\\Windows\\System32\\drivers\\etc\\hosts"));
        assert!(result.is_err());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn list_directory_sorts_dirs_first() {
        let root = setup_test_dir("list");
        let fs = FileSystemManager::new();
        std::fs::create_dir(root.join("subdir")).expect("mkdir");
        std::fs::write(root.join("file.txt"), "x").expect("write");
        let entries = fs
            .list_directory(&root, Path::new("."))
            .expect("list failed");
        assert!(entries[0].is_dir);
        assert!(!entries[1].is_dir);
        let _ = std::fs::remove_dir_all(&root);
    }
}
