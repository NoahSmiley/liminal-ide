use std::path::{Path, PathBuf};

use crate::error::ProjectError;

use super::Project;

fn projects_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("projects")
}

fn project_path(data_dir: &Path, id: &str) -> PathBuf {
    projects_dir(data_dir).join(format!("{id}.json"))
}

pub fn save(data_dir: &Path, project: &Project) -> Result<(), ProjectError> {
    let dir = projects_dir(data_dir);
    std::fs::create_dir_all(&dir)
        .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;

    let path = project_path(data_dir, &project.id.to_string());
    let json = serde_json::to_string_pretty(project)
        .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;

    std::fs::write(&path, json)
        .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;
    Ok(())
}

pub fn load_all(data_dir: &Path) -> Vec<Project> {
    let dir = projects_dir(data_dir);
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };

    entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let content = std::fs::read_to_string(e.path()).ok()?;
            serde_json::from_str(&content).ok()
        })
        .collect()
}

pub fn remove(data_dir: &Path, id: &str) -> Result<(), ProjectError> {
    let path = project_path(data_dir, id);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| ProjectError::InvalidPath(e.to_string()))?;
    }
    Ok(())
}
